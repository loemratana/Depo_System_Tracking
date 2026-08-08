import express from 'express';
import telegramController from '../controllers/telegramController.js';
import authMiddleware from '../middleware/auth.js';

const { authenticate, authorize } = authMiddleware;
const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/settings', telegramController.getSettings);
router.put('/settings', telegramController.updateSettings);
router.post('/test/:reportId', telegramController.testSend);

export default router;
