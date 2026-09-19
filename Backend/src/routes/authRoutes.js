import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import authController from '../controllers/authController.js';
import twoFactorController from '../controllers/twoFactorController.js';
import authMiddleware from '../middleware/auth.js';
import {
  loginValidator,
  refreshTokenValidator,
  changePasswordValidator,
  updateProfileValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  totpSetupVerifyValidator,
  twoFactorChallengeVerifyValidator,
} from '../validators/authValidator.js';
import { arcjetMiddleware } from '../middleware/arcjet.js';
import { getClientIp } from '../utils/clientIp.js';

const router = express.Router();
const { authenticate, authenticateForTwoFactorSetup } = authMiddleware;

// Basic brute-force protection independent of Arcjet — Arcjet
// (arcjetMiddleware below) is a stronger layer when ENABLE_ARCJET=true, but
// these endpoints must not be defenseless when it's off. Keyed on the real
// client IP (getClientIp — prefers Cloudflare's CF-Connecting-IP, never
// raw/spoofable X-Forwarded-For), not express-rate-limit's own extraction.
function authRateLimiter({ windowMs, max, code, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(getClientIp(req) || req.ip || 'unknown'),
    message: { success: false, message, code },
  });
}

const loginRateLimiter = authRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  code: 'AUTH_RATE_LIMITED',
  message: 'Too many login attempts. Please try again later.',
});

// Stricter than login: repeatedly requesting a reset for the same address
// emails/spams that inbox, not just a brute-force risk against this server.
const forgotPasswordRateLimiter = authRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  code: 'AUTH_RATE_LIMITED',
  message: 'Too many password reset requests. Please try again later.',
});

const resetPasswordRateLimiter = authRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  code: 'AUTH_RATE_LIMITED',
  message: 'Too many attempts. Please try again later.',
});

// For authenticated endpoints, key on the user rather than IP — two people
// behind the same NAT shouldn't share one budget, and unlike the limiters
// above this only ever runs after `authenticate`, so req.user is guaranteed
// to exist.
function userRateLimiter({ windowMs, max, code, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => String(req.user.id),
    message: { success: false, message, code },
  });
}

const totpSetupRateLimiter = userRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  code: 'AUTH_RATE_LIMITED',
  message: 'Too many attempts. Please try again later.',
});

// The login-challenge verify endpoint runs BEFORE authenticate (the client
// isn't logged in yet — that's the whole point of the challenge), so there
// is no req.user and IP-keying would let one IP's brute-force budget cover
// every challenge behind it. Key on the challengeId itself instead — the
// challenge's own attempt counter (loginChallengeService, Redis) is still
// the authoritative brute-force stop; this is just the IP/request-level
// backstop on top of it, same relationship as every other limiter here.
const twoFactorVerifyRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.body?.challengeId || 'unknown'),
  message: {
    success: false,
    message: 'Too many attempts. Please try again later.',
    code: 'AUTH_RATE_LIMITED',
  },
});

// Public routes (no self-register — admins create users via /api/v1/users)
router.post('/login', loginRateLimiter, arcjetMiddleware, loginValidator, authController.login);
router.post('/refresh', refreshTokenValidator, authController.refreshToken);
router.post(
  '/2fa/verify',
  twoFactorVerifyRateLimiter,
  twoFactorChallengeVerifyValidator,
  authController.verifyTwoFactorChallenge,
);
router.post(
  '/forgot-password',
  forgotPasswordRateLimiter,
  forgotPasswordValidator,
  authController.forgotPassword,
);
router.post(
  '/reset-password',
  resetPasswordRateLimiter,
  resetPasswordValidator,
  authController.resetPassword,
);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getProfile);
router.put('/me', authenticate, updateProfileValidator, authController.updateProfile);
router.post(
  '/change-password',
  authenticate,
  changePasswordValidator,
  authController.changePassword,
);

// 2FA enrollment — authenticateForTwoFactorSetup (not the stricter
// authenticate above) BEFORE the rate limiter, since totpSetupRateLimiter's
// keyGenerator reads req.user.id, and this pair of routes must accept
// either a real access token (voluntary opt-in from settings) or a
// mandatory-enrollment setup token (issued by authService.login() for a
// not-yet-enrolled account — see docs/2fa-architecture.md).
router.post(
  '/2fa/setup/totp',
  authenticateForTwoFactorSetup,
  totpSetupRateLimiter,
  twoFactorController.setupTotp,
);
router.post(
  '/2fa/setup/totp/verify',
  authenticateForTwoFactorSetup,
  totpSetupRateLimiter,
  totpSetupVerifyValidator,
  twoFactorController.verifySetupCode,
);

export default router;
