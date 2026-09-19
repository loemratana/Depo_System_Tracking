import crypto from 'crypto';
import { prisma } from '../config/db.js';
import bcrypt from 'bcryptjs';
import logger from '../config/logger.js';
import jwtConfig from '../config/jwt.js';
import environment from '../config/env.js';
import { sendMail } from '../config/mailer.js';
import { AppError, ErrorCodes } from '../utils/app-error.js';
import twoFactorService from './twoFactorService.js';
import loginChallengeService, { MAX_CHALLENGE_ATTEMPTS } from './loginChallengeService.js';
import passwordResetOtpService from './passwordResetOtpService.js';

const PROFILE_INCLUDE = {
    employee: {
        select: {
            id: true,
            englishName: true,
            khmerName: true,
            email: true,
            phone: true,
            images: true,
            department: true,
            position: true,
            hireDate: true,
            status: true,
        },
    },
};

function formatProfile(user) {
    const employee = user.employee || null;
    const fullName =
        employee?.englishName ||
        employee?.khmerName ||
        user.username;

    return {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        employeeId: user.employeeId,
        employee,
        // Flattened fields for the profile UI
        fullName,
        email: user.username,
        phone: employee?.phone || '',
        avatar: employee?.images || null,
        department: employee?.department || null,
        position: employee?.position || null,
        joinDate: employee?.hireDate || user.createdAt,
    };
}

// Login only needs enough to identify the session and render the
// signed-in user in the UI (name/avatar) — not account bookkeeping
// (status/lastLogin/createdAt/employeeId), the raw nested employee record
// (already flattened into fullName/avatar above), or profile-page-only
// fields (phone/department/position/joinDate). Use GET /me for the full
// profile.
function formatAuthUser(user) {
    const { id, username, role, fullName, email, avatar } = formatProfile(user);
    return { id, username, role, fullName, email, avatar };
}

class AuthService {
    // SHA-256 of the raw refresh token — the DB never stores the token a
    // client could actually present (see RefreshToken.tokenHash). A leaked
    // database dump alone is not enough to impersonate a session; the raw
    // JWT (correctly signed with JWT_REFRESH_SECRET, which is not in the
    // dump) is still required.
    #hashRefreshToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    // Issues an access+refresh token pair and persists the refresh token's
    // hash (see RefreshToken model) so it can later be looked up, revoked,
    // and rotated. Shared by login() and refreshToken() so there's exactly
    // one place that creates a RefreshToken row.
    async #issueTokens(user, profile) {
        const tokens = jwtConfig.generateTokenPair({
            id: user.id,
            email: user.username,
            role: user.role,
            name: profile.fullName,
        });

        await prisma.refreshToken.create({
            data: {
                id: crypto.randomUUID(),
                tokenHash: this.#hashRefreshToken(tokens.refreshToken),
                userId: user.id,
                expiresAt: jwtConfig.getTokenExpiry(tokens.refreshToken),
            },
        });

        return tokens;
    }

    /**
     * The shared "login is now fully complete" step — confirm the account is
     * still active, bump lastLogin (only NOW, not earlier — see login()'s
     * comment), and issue real tokens. Used by both verifyTwoFactorChallenge
     * (an already-enrolled user completing their TOTP challenge) and
     * twoFactorController.verifySetupCode (a user completing the MANDATORY
     * first-time enrollment login() forced them into below) — both need the
     * exact same finish once their respective code check passes.
     */
    async completeLogin(userId) {
        const existing = await prisma.user.findUnique({ where: { id: userId } });
        if (!existing || existing.status !== 'active') {
            // Rare edge case: the account was locked in the window between
            // password check and completing 2FA. Checked BEFORE touching
            // lastLogin — a blocked login must not still count as a
            // successful one.
            throw new AppError('Account is locked or inactive', 403, ErrorCodes.AUTH_FORBIDDEN);
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { lastLogin: new Date() },
            include: PROFILE_INCLUDE,
        });

        const profile = formatAuthUser(user);
        const tokens = await this.#issueTokens(user, profile);

        return { user: profile, tokens };
    }

    async login(credentials) {
        try {
            const { email, password } = credentials;

            const user = await prisma.user.findUnique({
                where: { username: email },
                include: PROFILE_INCLUDE,
            });

            if (!user) {
                throw new AppError('User not found', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
            }

            if (user.status !== 'active') {
                throw new AppError('Account is locked or inactive', 403, ErrorCodes.AUTH_FORBIDDEN);
            }

            const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
            if (!isPasswordValid) {
                throw new AppError('Invalid password', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
            }

            // lastLogin is deliberately NOT touched here yet — it means "last
            // SUCCESSFUL login", and that hasn't happened until either the
            // 2FA challenge or (for a not-yet-enrolled account) mandatory
            // setup below actually completes. Bumping it on password-check
            // alone would credit an abandoned/failed attempt as a login.
            if (await twoFactorService.isEnrolled(user.id)) {
                const availableMethods = ['totp'];
                const challenge = await loginChallengeService.createChallenge(user.id, availableMethods);
                return { challengeRequired: true, ...challenge };
            }

            // 2FA is mandatory for every account (see
            // docs/2fa-architecture.md), not opt-in — an account with no
            // TOTP enrolled yet does not get real tokens here. Instead it
            // gets a short-lived setup token that only unlocks the TOTP
            // setup endpoints (middleware/auth.js's
            // authenticateForTwoFactorSetup); real tokens are issued only
            // once twoFactorController.verifySetupCode confirms a valid
            // code and calls completeLogin() above.
            const setupToken = jwtConfig.generateTwoFactorSetupToken({ userId: user.id });

            return {
                setupRequired: true,
                setupToken,
                expiresIn: environment.jwt.twoFactorSetupExpiry,
            };
        } catch (error) {
            if (!error.isOperational) logger.error('Login service error:', error);
            throw error;
        }
    }

    /**
     * Completes a login that was interrupted for a 2FA challenge (see
     * login() above). The attempt counter lives in Redis alongside the
     * challenge itself (loginChallengeService) — incremented atomically on
     * every call, success or failure, so a caller can't dodge the limit by
     * racing requests. Exhausting MAX_CHALLENGE_ATTEMPTS or letting the
     * challenge expire both fail the same way: "invalid or expired
     * challenge", with no distinction exposed to the client between the two.
     */
    async verifyTwoFactorChallenge(challengeId, code) {
        const challenge = await loginChallengeService.getChallenge(challengeId);
        if (!challenge) {
            throw new AppError('Invalid or expired challenge', 401, ErrorCodes.AUTH_UNAUTHORIZED);
        }

        const attemptCount = await loginChallengeService.incrementAttempt(challengeId);
        if (attemptCount === null || attemptCount > MAX_CHALLENGE_ATTEMPTS) {
            await loginChallengeService.deleteChallenge(challengeId);
            throw new AppError('Invalid or expired challenge', 401, ErrorCodes.AUTH_UNAUTHORIZED);
        }

        const isValid = await twoFactorService.verifyLoginCode(challenge.userId, code);
        if (!isValid) {
            throw new AppError('Invalid verification code', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
        }

        // Single-use: whether this succeeds or the caller retries with a
        // stale challengeId next, that's now a fresh "no such challenge".
        await loginChallengeService.deleteChallenge(challengeId);

        return this.completeLogin(challenge.userId);
    }

    async getProfile(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: PROFILE_INCLUDE,
        });

        if (!user) {
            throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);
        }

        return formatProfile(user);
    }

    async updateProfile(userId, payload = {}) {
        const {
            fullName,
            name,
            email,
            phone,
            avatar,
            department,
        } = payload;

        const displayName = (fullName ?? name)?.trim();
        const nextEmail = email?.trim().toLowerCase();
        const nextPhone = phone !== undefined ? String(phone).trim() : undefined;
        const nextAvatar = avatar !== undefined ? (avatar || null) : undefined;
        const nextDepartment =
            department !== undefined ? (department?.trim() || null) : undefined;

        const existing = await prisma.user.findUnique({
            where: { id: userId },
            include: PROFILE_INCLUDE,
        });

        if (!existing) {
            throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);
        }

        if (nextEmail && nextEmail !== existing.username) {
            const taken = await prisma.user.findUnique({
                where: { username: nextEmail },
            });
            if (taken && taken.id !== userId) {
                throw new AppError('Email is already in use', 409, ErrorCodes.CONFLICT);
            }
        }

        await prisma.$transaction(async (tx) => {
            if (nextEmail && nextEmail !== existing.username) {
                await tx.user.update({
                    where: { id: userId },
                    data: { username: nextEmail },
                });
            }

            const employeeData = {};
            if (displayName !== undefined) {
                employeeData.englishName = displayName || null;
            }
            if (nextEmail !== undefined) {
                employeeData.email = nextEmail;
            }
            if (nextPhone !== undefined) {
                employeeData.phone = nextPhone || null;
            }
            if (nextAvatar !== undefined) {
                employeeData.images = nextAvatar;
            }
            if (nextDepartment !== undefined) {
                employeeData.department = nextDepartment;
            }

            if (Object.keys(employeeData).length === 0) {
                return;
            }

            if (existing.employeeId) {
                await tx.employee.update({
                    where: { id: existing.employeeId },
                    data: employeeData,
                });
                return;
            }

            const created = await tx.employee.create({
                data: {
                    englishName: displayName || existing.username,
                    email: nextEmail || existing.username,
                    phone: nextPhone || null,
                    images: nextAvatar || null,
                    department: nextDepartment || null,
                    status: 'active',
                },
            });

            await tx.user.update({
                where: { id: userId },
                data: { employeeId: created.id },
            });
        });

        return this.getProfile(userId);
    }

    async changePassword(userId, { currentPassword, newPassword }) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new AppError('User not found', 404, ErrorCodes.USER_NOT_FOUND);
        }

        const valid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!valid) {
            throw new AppError('Current password is incorrect', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
        }

        if (!newPassword || newPassword.length < 6) {
            throw new AppError(
                'New password must be at least 6 characters',
                422,
                ErrorCodes.VALIDATION_ERROR,
            );
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash },
        });

        return { success: true };
    }

    /**
     * Always resolves the same way regardless of whether the email exists,
     * is inactive, is inside the resend cooldown, or delivery failed —
     * callers must not be able to tell registered emails from unregistered
     * ones by this endpoint's response OR by it erroring (a 500 only for
     * real accounts, e.g. when the mail provider rejects the recipient,
     * would be the same leak). Delivery problems are logged, not thrown.
     * With no SMTP configured, config/mailer.js logs the email instead.
     */
    async requestPasswordReset(email) {
        const username = String(email || '').trim().toLowerCase();
        const user = username
            ? await prisma.user.findUnique({ where: { username } })
            : null;

        if (user && user.status === 'active') {
            let issued = null;
            try {
                issued = await passwordResetOtpService.issue(user.id);
                if (issued) {
                    const minutes = Math.round(issued.expiresIn / 60);
                    await sendMail({
                        to: user.username,
                        subject: 'Your password reset code',
                        text: `Your password reset code is ${issued.code}. It expires in ${minutes} minutes. If you didn't request this, you can ignore this email.`,
                        html: `<p>Your password reset code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px;">${issued.code}</p><p>It expires in ${minutes} minutes. If you didn't request this, you can ignore this email.</p>`,
                    });

                    logger.info('Password reset code sent', {
                        action: 'auth.password_reset.requested',
                        user_id: user.id,
                    });
                }
            } catch (error) {
                logger.error('Password reset code could not be issued or delivered', {
                    action: 'auth.password_reset.delivery_failed',
                    user_id: user.id,
                    err: error,
                });

                // Development only: the response is deliberately identical
                // whether or not delivery worked (no account enumeration), so
                // without this a dev whose mail provider is restricted (e.g.
                // Resend's onboarding sender only delivers to the account
                // owner) sees "code sent" and nothing else. Never outside
                // development — a live code must not end up in production logs.
                if (issued && !environment.isProduction) {
                    logger.warn(
                        `DEV ONLY: password reset code for ${user.username} is ${issued.code} (email delivery failed)`,
                        { action: 'auth.password_reset.dev_code', user_id: user.id },
                    );
                }
            }
        }

        return { success: true };
    }

    /**
     * Verifies the emailed 6-digit code (see passwordResetOtpService for the
     * attempt cap / expiry / single-use rules), then sets the new password.
     * Every failure — unknown or inactive account, wrong/expired/used code,
     * too many attempts — throws the SAME error so the response reveals
     * nothing about which one it was. On success, also revokes every
     * outstanding refresh token for this user: a password reset is a strong
     * enough signal to end every existing session, not just issue a new
     * password.
     */
    async resetPassword({ email, otp, newPassword }) {
        if (!newPassword || newPassword.length < 6) {
            throw new AppError(
                'New password must be at least 6 characters',
                422,
                ErrorCodes.VALIDATION_ERROR,
            );
        }

        const invalidCode = () =>
            new AppError('Invalid or expired verification code', 401, ErrorCodes.AUTH_UNAUTHORIZED);

        const username = String(email || '').trim().toLowerCase();
        const user = username
            ? await prisma.user.findUnique({ where: { username } })
            : null;
        if (!user || user.status !== 'active') {
            throw invalidCode();
        }

        const ok = await passwordResetOtpService.verifyAndConsume(user.id, otp);
        if (!ok) {
            logger.warn('Password reset code rejected', {
                action: 'auth.password_reset.code_rejected',
                userId: user.id,
            });
            throw invalidCode();
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await prisma.$transaction([
            prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
            prisma.refreshToken.updateMany({
                where: { userId: user.id, isRevoked: false },
                data: { isRevoked: true },
            }),
        ]);

        logger.info('Password reset completed', {
            action: 'auth.password_reset.completed',
            user_id: user.id,
        });

        return { success: true };
    }

    /**
     * Refresh lifecycle: verify the JWT signature/expiry first (rejects
     * forged/expired tokens without touching the DB), then hash it and look
     * up the persisted row —
     *   - not found or already revoked -> reject AND log a security event
     *     (a legitimate client never presents a token twice; this is what
     *     a stolen-and-reused refresh token looks like). Never logs the
     *     token itself, only the userId it decoded to and which case fired.
     *   - otherwise -> revoke the old row, issue + persist a brand new
     *     access+refresh pair (rotation on every refresh, no exceptions).
     */
    async refreshToken(refreshToken) {
        if (!refreshToken) {
            throw new AppError('Refresh token is required', 401, ErrorCodes.AUTH_REFRESH_TOKEN_INVALID);
        }

        let decoded;
        try {
            decoded = jwtConfig.verifyRefreshToken(refreshToken);
        } catch {
            throw new AppError('Invalid refresh token', 401, ErrorCodes.AUTH_REFRESH_TOKEN_INVALID);
        }

        const userId = decoded.userId || decoded.id;
        const tokenHash = this.#hashRefreshToken(refreshToken);
        const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

        if (!stored) {
            logger.warn('Refresh token not found in store', {
                action: 'auth.refresh_token.unknown',
                userId,
            });
            throw new AppError('Invalid refresh token', 401, ErrorCodes.AUTH_REFRESH_TOKEN_INVALID);
        }

        if (stored.isRevoked) {
            // A previously-rotated (or already logged-out) token being
            // presented again — the strongest signal available here that a
            // refresh token has leaked. Does not itself revoke the rest of
            // the user's sessions (out of scope for this pass); at minimum
            // it's now visible in logs/alerts instead of silently succeeding.
            logger.warn('Revoked refresh token reused', {
                action: 'auth.refresh_token.reuse_detected',
                userId: stored.userId,
            });
            throw new AppError(
                'Refresh token has been revoked',
                401,
                ErrorCodes.AUTH_REFRESH_TOKEN_REVOKED,
            );
        }

        if (stored.expiresAt < new Date()) {
            throw new AppError('Refresh token expired', 401, ErrorCodes.AUTH_REFRESH_TOKEN_INVALID);
        }

        const user = await prisma.user.findUnique({
            where: { id: stored.userId },
            include: PROFILE_INCLUDE,
        });

        if (!user || user.status !== 'active') {
            throw new AppError('Invalid refresh token', 401, ErrorCodes.AUTH_REFRESH_TOKEN_INVALID);
        }

        await prisma.refreshToken.update({
            where: { id: stored.id },
            data: { isRevoked: true },
        });

        const profile = formatProfile(user);
        return this.#issueTokens(user, profile);
    }

    /**
     * Idempotent by design: a client logging out with an already-expired or
     * already-revoked refresh token still gets a success response (nothing
     * left to revoke isn't an error). Does not require the token to still
     * pass signature verification — revocation is a pure hash lookup, so a
     * logout attempt with a technically-expired-but-still-hashable token
     * still correctly revokes it.
     */
    async logout(_accessToken, refreshToken) {
        if (!refreshToken) {
            return { success: true };
        }

        const tokenHash = this.#hashRefreshToken(refreshToken);
        await prisma.refreshToken.updateMany({
            where: { tokenHash, isRevoked: false },
            data: { isRevoked: true },
        });

        return { success: true };
    }
}

export default new AuthService();
