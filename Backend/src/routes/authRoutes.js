import express from 'express';
import authController from '../controllers/authController.js';
import authMiddleware from '../middleware/auth.js';
import {
  loginValidator,
  refreshTokenValidator,
  changePasswordValidator,
  updateProfileValidator,
} from '../validators/authValidator.js';
import { arcjetMiddleware } from '../middleware/arcjet.js';

const router = express.Router();
const { authenticate } = authMiddleware;

// Public routes (no self-register — admins create users via /api/v1/users)
router.post('/login', arcjetMiddleware, loginValidator, authController.login);
router.post('/refresh', refreshTokenValidator, authController.refreshToken);

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

export default router;
