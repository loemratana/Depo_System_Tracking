// config/encryption.js
//
// AES-256-GCM for data that must be encrypted, not hashed — currently just
// the TOTP secret (src/services/twoFactorService.js, once written): unlike
// a password or refresh token, the server has to recover the plaintext
// secret on every login to compute the expected code, so hashing (one-way)
// isn't an option the way it is for authService.js's #hashRefreshToken/
// #passwordFingerprint.
//
// ciphertext/iv/authTag are returned and stored as three separate Buffers
// (matching UserTwoFactor.secretCiphertext/secretIv/secretAuthTag in
// schema.prisma) rather than packed into one blob — explicit, typed
// columns, consistent with how the rest of this schema is modeled.
import crypto from 'crypto';
import environment from './env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit nonce, the size GCM is designed for
const KEY = Buffer.from(environment.totpEncryptionKey, 'base64');

if (KEY.length !== 32) {
  throw new Error(
    `TOTP_ENCRYPTION_KEY must decode to exactly 32 bytes for AES-256-GCM (got ${KEY.length}). ` +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
  );
}

/**
 * Encrypts `plaintext` with a freshly-generated IV (never reused, never
 * derived from anything) and returns the three pieces a caller must store
 * to ever decrypt it again. Losing any one of them makes the ciphertext
 * permanently unrecoverable — that's GCM working as intended, not a bug to
 * work around.
 */
export function encryptSecret(plaintext) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  const ciphertext = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return { ciphertext, iv, authTag };
}

/**
 * Decrypts a {ciphertext, iv, authTag} triple produced by encryptSecret.
 * setAuthTag() MUST be called before update()/final() — GCM verifies the
 * tag as part of decryption, not as a separate step afterward. A wrong key,
 * a flipped bit anywhere in the ciphertext, or a mismatched tag all surface
 * the same way: final() throws instead of returning corrupted plaintext.
 * That throw is the authentication check succeeding at its job — let it
 * propagate (or wrap it in an AppError at the call site), never swallow it.
 */
export function decryptSecret({ ciphertext, iv, authTag }) {
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plaintext.toString('utf8');
}
