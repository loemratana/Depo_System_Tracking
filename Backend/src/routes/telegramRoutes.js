import express from 'express';
import telegramController from '../controllers/telegramController.js';
import telegramChatController from '../controllers/telegramChatController.js';
import authMiddleware from '../middleware/auth.js';
import {
  listTelegramChatsValidator,
  chatIdParamValidator,
  createTelegramChatValidator,
  updateTelegramChatValidator,
  testSendValidator,
} from '../validators/telegramChatValidator.js';

const { authenticate, authorize } = authMiddleware;
const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/settings', telegramController.getSettings);
router.put('/settings', telegramController.updateSettings);
router.post('/test/:reportId', testSendValidator, telegramController.testSend);

// Brand <-> Telegram chat routing (source of truth for outbound/inbound routing)
router.get('/chats', listTelegramChatsValidator, telegramChatController.list);
router.post('/chats', createTelegramChatValidator, telegramChatController.create);
router.get('/chats/:id', chatIdParamValidator, telegramChatController.getById);
router.patch('/chats/:id', updateTelegramChatValidator, telegramChatController.update);
router.delete('/chats/:id', chatIdParamValidator, telegramChatController.remove);
router.post('/chats/:id/test', chatIdParamValidator, telegramChatController.test);

export default router;
