import authService from '../services/authService.js';
import logger from '../config/logger.js';

class AuthController {
    handleError = (res, error, message = 'An error occurred', statusCode = 500) => {
        logger.error(`${message}:`, error);

        const knownClientErrors = [
            'User not found',
            'User already exists',
            'Invalid password',
            'Current password is incorrect',
            'Account is locked or inactive',
            'Email is already in use',
            'New password must be at least 6 characters',
        ];

        const code = knownClientErrors.includes(error.message) ? 400 : statusCode;

        return res.status(code).json({
            success: false,
            message: error.message || message,
            error: error.message,
        });
    };

    register = async (req, res) => {
        return res.status(403).json({
            success: false,
            message: 'Public registration is disabled. Ask an admin to create your account.',
            error: 'Registration disabled',
        });
    };

    login = async (req, res) => {
        try {
            const result = await authService.login(req.body);
            res.json({
                success: true,
                message: 'Login successful',
                data: result,
            });
        } catch (error) {
            this.handleError(res, error, 'Failed to login');
        }
    };

    refreshToken = async (req, res) => {
        try {
            const result = await authService.refreshToken(req.body.refreshToken);
            return res.status(200).json({
                success: true,
                message: 'Access token refreshed successfully',
                data: result,
            });
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: error.message || 'Failed to refresh access token',
                error: 'Unauthorized',
            });
        }
    };

    logout = async (req, res) => {
        try {
            const { refreshToken, accessToken } = req.body;
            const result = await authService.logout(accessToken, refreshToken);
            return res.status(200).json({
                success: true,
                message: 'Logout successful',
                data: result,
            });
        } catch (error) {
            this.handleError(res, error, 'Failed to logout');
        }
    };

    getProfile = async (req, res) => {
        try {
            const profile = await authService.getProfile(req.user.id);
            return res.json({
                success: true,
                data: profile,
            });
        } catch (error) {
            this.handleError(res, error, 'Failed to load profile');
        }
    };

    updateProfile = async (req, res) => {
        try {
            const profile = await authService.updateProfile(req.user.id, req.body);
            return res.json({
                success: true,
                message: 'Profile updated successfully',
                data: profile,
            });
        } catch (error) {
            this.handleError(res, error, 'Failed to update profile');
        }
    };

    changePassword = async (req, res) => {
        try {
            const result = await authService.changePassword(req.user.id, req.body);
            return res.json({
                success: true,
                message: 'Password changed successfully',
                data: result,
            });
        } catch (error) {
            this.handleError(res, error, 'Failed to change password');
        }
    };
}

export default new AuthController();
