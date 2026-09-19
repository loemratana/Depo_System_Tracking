// services/passwordResetOtpService.js
//
// Short-lived 6-digit password-reset code, Redis-backed like
// loginChallengeService (same reasoning: a self-expiring, attempt-counted
// value is what Redis is for; no Postgres table/cleanup job needed).
//
// Security properties, all enforced here rather than left to callers:
//   - The code is stored as an HMAC (keyed with the server's JWT secret and
//     bound to the user id), never in plaintext. A 6-digit space is
//     brute-forceable offline from ANY hash, so the real protection is the
//     short TTL + attempt cap below — the HMAC just avoids keeping the
//     usable code sitting in Redis.
//   - At most MAX_ATTEMPTS guesses per issued code; the code is destroyed on
//     the last miss, so an attacker must trigger a fresh email (rate-limited
//     by RESEND_COOLDOWN_SECONDS here and by the route's IP limiter).
//   - Single use: the atomic DEL on success decides who consumed it, so two
//     concurrent correct submissions can't both succeed.
import crypto from 'crypto';
import redis from '../config/redis.js';
import environment from '../config/env.js';

const TTL_SECONDS = 10 * 60;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

const codeKey = (userId) => `pwreset:otp:${userId}`;
const cooldownKey = (userId) => `pwreset:cooldown:${userId}`;

function hashCode(userId, code) {
  return crypto
    .createHmac('sha256', environment.jwt.secret)
    .update(`pwreset:${userId}:${code}`)
    .digest('hex');
}

function safeEqualHex(a, b) {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

class PasswordResetOtpService {
  /**
   * Issues a fresh code for the user, replacing any previous one.
   * Returns `{ code, expiresIn }`, or `null` if a code was already issued
   * within the resend cooldown (caller should silently skip sending — the
   * earlier email's code is still valid).
   */
  async issue(userId) {
    // SET NX EX: only the first request in the window gets 'OK'.
    const claimed = await redis.set(
      cooldownKey(userId),
      '1',
      'EX',
      RESEND_COOLDOWN_SECONDS,
      'NX',
    );
    if (claimed !== 'OK') return null;

    // randomInt is uniform (no modulo bias) and CSPRNG-backed.
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

    // MULTI so the value and its TTL land together — a hash without a TTL
    // would be a code that never expires.
    await redis
      .multi()
      .hset(codeKey(userId), {
        codeHash: hashCode(userId, code),
        attemptCount: '0',
      })
      .expire(codeKey(userId), TTL_SECONDS)
      .exec();

    return { code, expiresIn: TTL_SECONDS };
  }

  /**
   * True only for a correct, unexpired, not-yet-exhausted code — and
   * consumes it. Every other outcome (no code, expired, wrong, too many
   * attempts, lost a race) is the same `false`; callers must not
   * distinguish them to the client.
   */
  async verifyAndConsume(userId, code) {
    const key = codeKey(userId);
    const data = await redis.hgetall(key);
    if (!data || !data.codeHash) return false;

    // Count the attempt BEFORE comparing, atomically (HINCRBY), so
    // concurrent guesses can't each read the same count and exceed the cap.
    const attempts = await redis.hincrby(key, 'attemptCount', 1);
    if (attempts > MAX_ATTEMPTS) {
      await redis.del(key);
      return false;
    }

    const submitted = /^\d{6}$/.test(String(code)) ? String(code) : null;
    const matches =
      submitted !== null &&
      safeEqualHex(hashCode(userId, submitted), data.codeHash);

    if (!matches) {
      if (attempts >= MAX_ATTEMPTS) await redis.del(key);
      return false;
    }

    // DEL returns 1 only for the caller that actually removed the key.
    return (await redis.del(key)) === 1;
  }
}

export const MAX_RESET_ATTEMPTS = MAX_ATTEMPTS;
export const RESET_CODE_TTL_SECONDS = TTL_SECONDS;
export default new PasswordResetOtpService();
