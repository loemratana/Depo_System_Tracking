
import crypto from 'crypto';
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import { prisma } from '../config/db.js';
import { encryptSecret, decryptSecret } from '../config/encryption.js';
import { AppError, ErrorCodes } from '../utils/app-error.js';

const ISSUER = 'Depot System';
// ±1 time-step of clock-drift forgiveness (30s each way) — otplib defaults
// to 0 (none), which would reject a real user's code over ordinary phone
// clock drift.
const EPOCH_TOLERANCE_SECONDS = 30;
const RECOVERY_CODE_COUNT = 10;

function hashRecoveryCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

// XXXX-XXXX, uppercase alphanumeric — human-typeable, cryptographically
// random (crypto.randomBytes, not Math.random).
function generateRecoveryCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity
  const bytes = crypto.randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += alphabet[bytes[i] % alphabet.length];
    if (i === 3) code += '-';
  }
  return code;
}

class TwoFactorService {
  /**
   * Starts (or restarts) TOTP enrollment. Upsert, not create: calling this
   * again before verifying just replaces the pending secret rather than
   * erroring on the @unique userId — a user who navigates away mid-setup
   * and comes back shouldn't get stuck.
   */
  async setupTotp(userId, username) {
    const secret = generateSecret();
    const { ciphertext, iv, authTag } = encryptSecret(secret);

    await prisma.userTwoFactor.upsert({
      where: { userId },
      create: {
        userId,
        secretCiphertext: ciphertext,
        secretIv: iv,
        secretAuthTag: authTag,
        isVerified: false,
      },
      update: {
        secretCiphertext: ciphertext,
        secretIv: iv,
        secretAuthTag: authTag,
        isVerified: false,
        keyVersion: 1,
      },
    });

    const otpauthUrl = generateURI({ issuer: ISSUER, label: username, secret });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return {
      // Returned once here too — the "can't scan? enter this code manually"
      // fallback every real authenticator app setup screen offers.
      secret,
      otpauthUrl,
      qrCodeDataUrl,
    };
  }

  /**
   * Confirms enrollment: the user must prove they actually captured the
   * secret (scanned the QR / entered it manually) by producing a valid
   * code from it. On success, generates the one-time recovery-code batch —
   * not before, since a half-completed setup must not hand out codes for
   * 2FA that was never actually turned on.
   */
  async verifySetupCode(userId, code) {
    const record = await prisma.userTwoFactor.findUnique({ where: { userId } });
    if (!record) {
      throw new AppError('No 2FA setup in progress', 404, ErrorCodes.RESOURCE_NOT_FOUND);
    }

    const secret = decryptSecret({
      ciphertext: record.secretCiphertext,
      iv: record.secretIv,
      authTag: record.secretAuthTag,
    });

    const { valid } = await verify({ secret, token: code, epochTolerance: EPOCH_TOLERANCE_SECONDS });
    if (!valid) {
      throw new AppError('Invalid verification code', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
    }

    const rawRecoveryCodes = Array.from({ length: RECOVERY_CODE_COUNT }, generateRecoveryCode);

    await prisma.$transaction([
      prisma.userTwoFactor.update({
        where: { userId },
        data: { isVerified: true, verifiedAt: new Date() },
      }),
      // Regeneration (a separate, later endpoint) will delete-then-insert
      // the same way — no prior rows exist yet on first-time setup, so a
      // plain createMany is correct here.
      prisma.recoveryCode.createMany({
        data: rawRecoveryCodes.map((rawCode) => ({
          userId,
          codeHash: hashRecoveryCode(rawCode),
        })),
      }),
    ]);

    return { recoveryCodes: rawRecoveryCodes };
  }

  /** Whether login should challenge this user for a second factor at all. */
  async isEnrolled(userId) {
    const record = await prisma.userTwoFactor.findUnique({ where: { userId } });
    return Boolean(record?.isVerified);
  }

  /**
   * Login-time verification — deliberately separate from verifySetupCode
   * above, which allows an unverified (in-progress) row; this requires
   * isVerified=true, since it's guarding an already-established login, not
   * confirming a brand-new enrollment. Returns a plain boolean rather than
   * throwing: the caller (authService.verifyTwoFactorChallenge) already has
   * its own attempt-count/challenge-expiry error handling to layer this
   * into, and "wrong code" here isn't itself the only way this can fail.
   */
  async verifyLoginCode(userId, code) {
    const record = await prisma.userTwoFactor.findUnique({ where: { userId } });
    if (!record?.isVerified) return false;

    const secret = decryptSecret({
      ciphertext: record.secretCiphertext,
      iv: record.secretIv,
      authTag: record.secretAuthTag,
    });

    const { valid } = await verify({ secret, token: code, epochTolerance: EPOCH_TOLERANCE_SECONDS });
    return valid;
  }
}

export default new TwoFactorService();
