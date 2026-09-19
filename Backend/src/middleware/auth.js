import jwtConfig from '../config/jwt.js';
import logger from '../config/logger.js';
import { prisma } from '../config/db.js';
import { setContextUserId } from '../config/requestContext.js';
import permissionService from '../services/permissionService.js';


const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No token provided',
                message: 'Authentication token is missing'
            });
        }
        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token format',
                message: 'Token must be in Bearer format'
            });
        }
        
        const decodedToken = jwtConfig.verifyAccessToken(token);
        if (!decodedToken) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token',
                message: 'Token verification failed'
            });
        }

        // Get user from DB
        // The token payload contains userId (see jwt.js generateTokenPair)
        const userId = decodedToken.userId || decodedToken.id;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token',
                message: 'Token payload missing user identifier'
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                role: true,
                status: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found',
                message: 'User no longer exists'
            });
        }

        if (user.status !== 'active') {
            return res.status(401).json({
                success: false,
                error: 'Account disabled',
                message: 'Your account is not active'
            });
        }

        req.user = user;
        req.accessToken = token;
        setContextUserId(user.id);

        next();
    }
    catch (error) {
        logger.error('Authentication error:', error);

        return res.status(401).json({
            success: false,
            error: 'Authentication failed',
            message: error.message || 'Invalid token'
        });
    }
}

// Same shape as authenticate() above, but accepts either a real access
// token OR a mandatory-2FA-setup token (see config/jwt.js's
// generateTwoFactorSetupToken / verifyAccessOrTwoFactorSetupToken). Used
// ONLY on the TOTP setup routes (POST /auth/2fa/setup/totp and
// /setup/totp/verify) so they work for both an already-logged-in user
// turning 2FA on voluntarily (real access token) and a user forced through
// mandatory enrollment right after password login (setup token, issued by
// authService.login() when the account isn't enrolled yet). Every other
// protected route still uses authenticate() above, which only accepts a
// real access token — a setup token can't reach anything beyond these two
// endpoints.
const authenticateForTwoFactorSetup = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No token provided',
                message: 'Authentication token is missing'
            });
        }
        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token format',
                message: 'Token must be in Bearer format'
            });
        }

        let decodedToken;
        try {
            decodedToken = jwtConfig.verifyAccessOrTwoFactorSetupToken(token);
        } catch {
            return res.status(401).json({
                success: false,
                error: 'Invalid token',
                message: 'Token verification failed'
            });
        }

        const userId = decodedToken.userId || decodedToken.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token',
                message: 'Token payload missing user identifier'
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                role: true,
                status: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found',
                message: 'User no longer exists'
            });
        }

        if (user.status !== 'active') {
            return res.status(401).json({
                success: false,
                error: 'Account disabled',
                message: 'Your account is not active'
            });
        }

        req.user = user;
        req.accessToken = token;
        req.authTokenType = decodedToken.type;
        setContextUserId(user.id);

        next();
    }
    catch (error) {
        logger.error('Authentication error:', error);

        return res.status(401).json({
            success: false,
            error: 'Authentication failed',
            message: error.message || 'Invalid token'
        });
    }
}

// Role-based Authorization
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Login required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden',
                message: 'Access denied'
            });
        }

        next();
    };
};

// Permission middleware — checks the requesting user's role against the
// role_permissions table (admin always passes; see permissionService.js)
const hasPermission = (permissionCode) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized'
            });
        }

        try {
            const allowed = await permissionService.roleHasPermission(req.user.role, permissionCode);
            if (allowed) {
                return next();
            }

            return res.status(403).json({
                success: false,
                error: 'No permission',
                message: `Missing permission: ${permissionCode}`
            });
        } catch (error) {
            logger.error('Permission check error:', error);
            return res.status(500).json({
                success: false,
                error: 'Permission check failed'
            });
        }
    };
};

// Extract token helper
const extractToken = (req) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }

    if (req.cookies?.accessToken) {
        return req.cookies.accessToken;
    }

    return null;
};


export default {
    authenticate,
    authenticateForTwoFactorSetup,
    authorize,
    hasPermission,
    extractToken
}
