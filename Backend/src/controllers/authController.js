import authService from '../services/authService.js';
import logger from '../config/logger.js';
import auditLogService from '../services/auditLogService.js';

// Async handlers below deliberately have no try/catch: Express 5 forwards a
// thrown/rejected error from an async route handler to the error-handling
// middleware (middleware/errorHandler.js) on its own — no asyncHandler
// wrapper needed. authService throws AppError (utils/app-error.js) for
// every expected failure (invalid credentials, not found, ...), which the
// centralized handler already knows how to turn into a consistent
// { success, message, code } response. login() is the one exception: it
// needs to record a failed-login audit entry (with the real client IP/
// request id, only available here via req) before the error continues on
// to the global handler, so it keeps a catch block for that side effect.
class AuthController {
    login = async (req, res, next) => {
        try {
            const result = await authService.login(req.body);

            // Three shapes possible now: an already-2FA-enrolled user gets a
            // challenge; a not-yet-enrolled user (2FA is mandatory for
            // everyone — see docs/2fa-architecture.md) gets a setup token
            // instead of a challenge; either way login isn't actually
            // complete yet, so both are distinct audit actions, not
            // auth.login.success.
            if (result.challengeRequired) {
                auditLogService.logFromRequest(req, {
                    action: 'auth.login.challenge_issued',
                    entityType: 'user',
                    metadata: { email: req.body?.email },
                });
                return res.json({
                    success: true,
                    message: 'Verification required',
                    data: result,
                });
            }

            if (result.setupRequired) {
                auditLogService.logFromRequest(req, {
                    action: 'auth.login.2fa_setup_required',
                    entityType: 'user',
                    metadata: { email: req.body?.email },
                });
                return res.json({
                    success: true,
                    message: 'Two-factor setup required',
                    data: result,
                });
            }

            logger.info('User logged in', {
                action: 'auth.login.success',
                user_id: result.user.id,
            });
            auditLogService.logFromRequest(req, {
                action: 'auth.login.success',
                entityType: 'user',
                entityId: result.user.id,
                userId: result.user.id,
                username: result.user.username,
            });
            res.json({
                success: true,
                message: 'Login successful',
                data: result,
            });
        } catch (error) {
            logger.warn('Login failed', {
                action: 'auth.login.failed',
                reason: error.message,
            });
            auditLogService.logFromRequest(req, {
                action: 'auth.login.failed',
                entityType: 'user',
                metadata: { email: req.body?.email, reason: error.message },
            });
            next(error);
        }
    };

    verifyTwoFactorChallenge = async (req, res, next) => {
        try {
            const result = await authService.verifyTwoFactorChallenge(req.body.challengeId, req.body.code);

            logger.info('2FA challenge verified, user logged in', {
                action: 'auth.login.success',
                user_id: result.user.id,
            });
            auditLogService.logFromRequest(req, {
                action: 'auth.2fa.verify.success',
                entityType: 'user',
                entityId: result.user.id,
                userId: result.user.id,
                username: result.user.username,
            });
            return res.json({
                success: true,
                message: 'Login successful',
                data: result,
            });
        } catch (error) {
            auditLogService.logFromRequest(req, {
                action: 'auth.2fa.verify.failed',
                entityType: 'user',
                metadata: { challengeId: req.body?.challengeId, reason: error.message },
            });
            next(error);
        }
    };

    refreshToken = async (req, res) => {
        const result = await authService.refreshToken(req.body.refreshToken);
        return res.status(200).json({
            success: true,
            message: 'Access token refreshed successfully',
            data: result,
        });
    };

    logout = async (req, res) => {
        const { refreshToken, accessToken } = req.body;
        const result = await authService.logout(accessToken, refreshToken);
        logger.info('User logged out', { action: 'auth.logout' });
        return res.status(200).json({
            success: true,
            message: 'Logout successful',
            data: result,
        });
    };

    getProfile = async (req, res) => {
        const profile = await authService.getProfile(req.user.id);
        return res.json({
            success: true,
            data: profile,
        });
    };

    updateProfile = async (req, res) => {
        const profile = await authService.updateProfile(req.user.id, req.body);
        return res.json({
            success: true,
            message: 'Profile updated successfully',
            data: profile,
        });
    };

    changePassword = async (req, res) => {
        const result = await authService.changePassword(req.user.id, req.body);
        return res.json({
            success: true,
            message: 'Password changed successfully',
            data: result,
        });
    };

    // Always the same response whether or not the email is registered —
    // see authService.requestPasswordReset for why.
    forgotPassword = async (req, res) => {
        await authService.requestPasswordReset(req.body.email);
        return res.json({
            success: true,
            message: 'If that email is registered, a verification code has been sent.',
        });
    };

    resetPassword = async (req, res) => {
        const { email, otp, newPassword } = req.body;
        const result = await authService.resetPassword({ email, otp, newPassword });
        return res.json({
            success: true,
            message: 'Password reset successfully. Please log in with your new password.',
            data: result,
        });
    };
}

export default new AuthController();
