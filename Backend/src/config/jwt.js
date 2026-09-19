// config/jwt.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import environment from './env.js';
import logger from './logger.js';

class JWTConfig {
    constructor() {
        // environment.js already fails fast in production if either secret
        // is missing (and provides a clearly-marked, fixed dev-only default
        // otherwise) — no more crypto.randomBytes() fallback here, which
        // used to mint a brand-new random secret on every process start.
        this.secret = environment.jwt.secret;
        this.refreshSecret = environment.jwt.refreshSecret;

        // Token expiration times
        this.accessTokenExpiry = environment.jwt.accessExpiry;
        this.refreshTokenExpiry = environment.jwt.refreshExpiry;
        this.verifyTokenExpiry = environment.jwt.verifyExpiry;
        this.twoFactorSetupTokenExpiry = environment.jwt.twoFactorSetupExpiry;

        // Algorithm
        this.algorithm = 'HS256';

        // Issuer and audience
        this.issuer = environment.jwt.issuer;
        this.audience = environment.jwt.audience;
    }

    // Generate Access Token
    generateAccessToken(payload) {
        try {
            const token = jwt.sign(
                {
                    ...payload,
                    type: 'access'
                },
                this.secret,
                {
                    expiresIn: this.accessTokenExpiry,
                    issuer: this.issuer,
                    audience: this.audience,
                    algorithm: this.algorithm
                }
            );

            return token;
        } catch (error) {
            logger.error('Access token generation failed:', error);
            throw new Error('Failed to generate access token');
        }
    }

    // Generate Refresh Token
    generateRefreshToken(payload) {
        try {
            const token = jwt.sign(
                {
                    ...payload,
                    type: 'refresh',
                    tokenId: crypto.randomBytes(16).toString('hex')
                },
                this.refreshSecret,
                {
                    expiresIn: this.refreshTokenExpiry,
                    issuer: this.issuer,
                    audience: this.audience,
                    algorithm: this.algorithm
                }
            );

            return token;
        } catch (error) {
            logger.error('Refresh token generation failed:', error);
            throw new Error('Failed to generate refresh token');
        }
    }

    // Generate Email Verification Token
    generateVerifyToken(payload) {
        try {
            const token = jwt.sign(
                {
                    ...payload,
                    type: 'verify',
                    purpose: 'email_verification'
                },
                this.secret,
                {
                    expiresIn: this.verifyTokenExpiry,
                    issuer: this.issuer,
                    audience: this.audience,
                    algorithm: this.algorithm
                }
            );

            return token;
        } catch (error) {
            logger.error('Verification token generation failed:', error);
            throw new Error('Failed to generate verification token');
        }
    }

    // Verify Access Token
    verifyAccessToken(token) {
        try {
            const decoded = jwt.verify(token, this.secret, {
                issuer: this.issuer,
                audience: this.audience,
                algorithms: [this.algorithm]
            });

            if (decoded.type !== 'access') {
                throw new Error('Invalid token type');
            }

            return decoded;
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Access token expired');
            }
            if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid access token');
            }
            throw error;
        }
    }

    // Generate a mandatory-2FA-enrollment token: issued by login() instead
    // of a real access token when the account has no TOTP enrolled yet
    // (see docs/2fa-architecture.md — 2FA is mandatory for every account,
    // not opt-in). It authenticates the holder ONLY for the TOTP setup
    // endpoints (middleware/auth.js's authenticateForTwoFactorSetup) — every
    // other protected route still requires a real 'access' token, so this
    // can't be used to bypass enrollment and reach the rest of the API.
    generateTwoFactorSetupToken(payload) {
        try {
            const token = jwt.sign(
                {
                    ...payload,
                    type: '2fa_setup'
                },
                this.secret,
                {
                    expiresIn: this.twoFactorSetupTokenExpiry,
                    issuer: this.issuer,
                    audience: this.audience,
                    algorithm: this.algorithm
                }
            );

            return token;
        } catch (error) {
            logger.error('2FA setup token generation failed:', error);
            throw new Error('Failed to generate 2FA setup token');
        }
    }

    // Verify a mandatory-2FA-enrollment token (see generateTwoFactorSetupToken).
    verifyTwoFactorSetupToken(token) {
        try {
            const decoded = jwt.verify(token, this.secret, {
                issuer: this.issuer,
                audience: this.audience,
                algorithms: [this.algorithm]
            });

            if (decoded.type !== '2fa_setup') {
                throw new Error('Invalid token type');
            }

            return decoded;
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('2FA setup token expired');
            }
            if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid 2FA setup token');
            }
            throw error;
        }
    }

    // Accepts EITHER a real access token OR a 2FA-setup token — used only by
    // the TOTP setup endpoints, which must work for both an already-logged-in
    // user turning 2FA on voluntarily (real access token) and a user forced
    // through mandatory enrollment right after password login (setup token).
    // Every other protected route keeps using verifyAccessToken directly, so
    // a setup token can't reach anything beyond these two endpoints.
    verifyAccessOrTwoFactorSetupToken(token) {
        try {
            const decoded = jwt.verify(token, this.secret, {
                issuer: this.issuer,
                audience: this.audience,
                algorithms: [this.algorithm]
            });

            if (decoded.type !== 'access' && decoded.type !== '2fa_setup') {
                throw new Error('Invalid token type');
            }

            return decoded;
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token expired');
            }
            if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid token');
            }
            throw error;
        }
    }

    // Verify Refresh Token
    verifyRefreshToken(token) {
        try {
            const decoded = jwt.verify(token, this.refreshSecret, {
                issuer: this.issuer,
                audience: this.audience,
                algorithms: [this.algorithm]
            });

            if (decoded.type !== 'refresh') {
                throw new Error('Invalid token type');
            }

            return decoded;
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Refresh token expired');
            }
            if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid refresh token');
            }
            throw error;
        }
    }

    // Verify Email Token
    verifyEmailToken(token) {
        try {
            const decoded = jwt.verify(token, this.secret, {
                issuer: this.issuer,
                audience: this.audience,
                algorithms: [this.algorithm]
            });

            if (decoded.type !== 'verify' || decoded.purpose !== 'email_verification') {
                throw new Error('Invalid token type or purpose');
            }

            return decoded;
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Verification token expired');
            }
            throw new Error('Invalid verification token');
        }
    }

    // Decode Token (without verification)
    decodeToken(token) {
        return jwt.decode(token);
    }

    // Get Token Expiry Time
    getTokenExpiry(token) {
        const decoded = this.decodeToken(token);
        return decoded ? new Date(decoded.exp * 1000) : null;
    }

    // Check if Token is Expired
    isTokenExpired(token) {
        const expiry = this.getTokenExpiry(token);
        return expiry ? expiry < new Date() : true;
    }

    // Refresh Access Token using Refresh Token
    refreshAccessToken(refreshToken) {
        try {
            const decoded = this.verifyRefreshToken(refreshToken);
            const { userId, email, role } = decoded;

            // Generate new access token
            const newAccessToken = this.generateAccessToken({ userId, email, role });

            return {
                accessToken: newAccessToken,
                refreshToken: refreshToken, // Keep the same refresh token or generate new one
                expiresIn: this.accessTokenExpiry
            };
        } catch (error) {
            throw new Error('Invalid refresh token');
        }
    }

    // Generate Token Pair (Access + Refresh)
    generateTokenPair(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            name: user.name
        };

        return {
            accessToken: this.generateAccessToken(payload),
            refreshToken: this.generateRefreshToken(payload),
            expiresIn: this.accessTokenExpiry,
            tokenType: 'Bearer'
        };
    }
}

// Create singleton instance
const jwtConfig = new JWTConfig();

export default jwtConfig;