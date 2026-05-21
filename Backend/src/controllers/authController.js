import authService from '../services/authService.js';
import logger from '../config/logger.js';

class AuthController {
    handleError = (res, error, message = 'An error occurred', statusCode = 500) => {
        logger.error(`${message}:`, error);
        return res.status(statusCode).json({
            success: false,
            message,
            error: error.message
        });
    };

    register = async (req, res) => {
        try {
            const result = await authService.register(req.body);
            return res.status(201).json({
                success: true,
                message: "Registration successful",
                data: result
            });
        } catch (error) {
            this.handleError(res, error, "Failed to register");
        }
    };

    // Login
    login = async (req, res) => {
        try {
            const result = await authService.login(req.body);

            res.json({
                success: true,
                message: 'Login successful',
                data: result
            });
        } catch (error) {
            this.handleError(res, error, 'Failed to login');
        }
    };

    // Refresh access token
    refreshToken = async (req, res) => {
        try {
            const result = await authService.refreshToken(req.body.refreshToken);
            return res.status(200).json({
                success: true,
                message: "Access token refreshed successfully",
                data: result
            });
        } catch (error) {
            this.handleError(res, error, "Failed to refresh access token");
        }
    };

    // Logout
    logout = async (req, res) => {
        try {
            const { refreshToken, accessToken } = req.body;
            const result = await authService.logout(accessToken, refreshToken);
            return res.status(200).json({
                success: true,
                message: "Logout successful",
                data: result
            });
        } catch (error) {
            this.handleError(res, error, "Failed to logout");
        }
    };
}

export default new AuthController();