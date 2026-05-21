// config/jwt.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import environment from './env.js';
import logger from './logger.js';

class JWTConfig {
    constructor() {
        this.secret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
        this.refreshSecret = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex');

        // Token expiration times
        this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '7d';
        this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
        this.resetTokenExpiry = process.env.JWT_RESET_EXPIRY || '1h';
        this.verifyTokenExpiry = process.env.JWT_VERIFY_EXPIRY || '24h';

        // Algorithm
        this.algorithm = 'HS256';

        // Issuer and audience
        this.issuer = process.env.JWT_ISSUER || 'depot-management-api';
        this.audience = process.env.JWT_AUDIENCE || 'depot-management-client';
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

    // Generate Password Reset Token
    generateResetToken(payload) {
        try {
            const token = jwt.sign(
                {
                    ...payload,
                    type: 'reset',
                    purpose: 'password_reset'
                },
                this.secret,
                {
                    expiresIn: this.resetTokenExpiry,
                    issuer: this.issuer,
                    audience: this.audience,
                    algorithm: this.algorithm
                }
            );

            return token;
        } catch (error) {
            logger.error('Reset token generation failed:', error);
            throw new Error('Failed to generate reset token');
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

    // Verify Reset Token
    verifyResetToken(token) {
        try {
            const decoded = jwt.verify(token, this.secret, {
                issuer: this.issuer,
                audience: this.audience,
                algorithms: [this.algorithm]
            });

            if (decoded.type !== 'reset' || decoded.purpose !== 'password_reset') {
                throw new Error('Invalid token type or purpose');
            }

            return decoded;
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Reset token expired');
            }
            throw new Error('Invalid reset token');
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