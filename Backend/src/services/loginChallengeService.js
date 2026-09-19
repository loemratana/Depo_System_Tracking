// services/loginChallengeService.js
//
// Short-lived 2FA login challenge, Redis-backed (see docs/2fa-architecture.md
// §12 for why Redis over Postgres here). Verified against the real
// docker-compose `redis` service before writing this: hset/expire/hincrby/
// hgetall/exists/del all behave exactly as used below, and a TTL set via
// EXPIRE survives subsequent HINCRBY calls on the same key (confirmed live,
// not assumed).
import crypto from 'crypto';
import redis from '../config/redis.js';

const TTL_SECONDS = 5 * 60;
const MAX_ATTEMPTS = 5;

function challengeKey(challengeId) {
  return `2fa:challenge:${challengeId}`;
}

class LoginChallengeService {
  /** Creates a new challenge for a user who passed password verification but has 2FA enrolled. */
  async createChallenge(userId, methodsAvailable) {
    const challengeId = crypto.randomUUID();
    const key = challengeKey(challengeId);

    await redis.hset(key, {
      userId: String(userId),
      methodsAvailable: JSON.stringify(methodsAvailable),
      attemptCount: '0',
    });
    await redis.expire(key, TTL_SECONDS);

    return { challengeId, expiresIn: TTL_SECONDS, availableMethods: methodsAvailable };
  }

  /** Null if the challenge doesn't exist or has expired — same thing from the caller's perspective. */
  async getChallenge(challengeId) {
    const data = await redis.hgetall(challengeKey(challengeId));
    if (!data || Object.keys(data).length === 0) return null;

    return {
      userId: Number(data.userId),
      methodsAvailable: JSON.parse(data.methodsAvailable),
      attemptCount: Number(data.attemptCount),
    };
  }

  /**
   * Atomically increments and returns the new attempt count — HINCRBY, not
   * a read-modify-write, so two concurrent verify attempts against the same
   * challenge can't both read attemptCount=0 and silently lose an
   * increment. Returns null if the challenge no longer exists (already
   * expired or already consumed) so the caller doesn't have to make two
   * round trips to distinguish "gone" from "count is now N".
   */
  async incrementAttempt(challengeId) {
    const key = challengeKey(challengeId);
    const exists = await redis.exists(key);
    if (!exists) return null;
    return redis.hincrby(key, 'attemptCount', 1);
  }

  /** Single-use: called on both a successful verify and a maxed-out attempt count. */
  async deleteChallenge(challengeId) {
    await redis.del(challengeKey(challengeId));
  }
}

export const MAX_CHALLENGE_ATTEMPTS = MAX_ATTEMPTS;
export default new LoginChallengeService();
