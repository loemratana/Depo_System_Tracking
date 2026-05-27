import express from 'express';
import authController from '../controllers/authController.js';
// import authMiddleware from '../middleware/auth.js';
import {
    registerValidator,
    loginValidator,
    refreshTokenValidator,
    changePasswordValidator,
    forgotPasswordValidator,
    resetPasswordValidator,
    updateProfileValidator,
    userIdValidator,
    paginationValidator
} from '../validators/authValidator.js';

const router = express.Router();

// Public routes
router.post('/register', registerValidator, authController.register);
router.post('/login', loginValidator, authController.login);
router.post('/refresh', refreshTokenValidator, authController.refreshToken);

// router.post('/forgot-password', forgotPasswordValidator, authController.forgotPassword);
// router.post('/reset-password', resetPasswordValidator, authController.resetPassword);
// router.get('/verify-email', authController.verifyEmail);
// Protected routes (require authentication)
// router.use(authMiddleware.authenticate());

// router.post('/logout', authController.logout);
// router.post('/logout-all', authController.logoutAllDevices);
// router.post('/change-password', changePasswordValidator, authController.changePassword);
// router.get('/me', authController.getProfile);
// router.put('/me', updateProfileValidator, authController.updateProfile);
// router.post('/resend-verification', authController.resendVerificationEmail);

// // Admin only routes
// router.use(authMiddleware.authorize('ADMIN'));

// router.get('/users', paginationValidator, authController.getAllUsers);
// router.get('/users/:id', userIdValidator, authController.getUserById);
// router.put('/users/:id/role', userIdValidator, authController.updateUserRole);
// router.patch('/users/:id/status', userIdValidator, authController.toggleUserStatus);
// router.delete('/users/:id', userIdValidator, authController.deleteUser);
export default router;