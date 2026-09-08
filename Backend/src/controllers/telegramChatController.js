import telegramChatService from '../services/telegramChatService.js';
import { telegramService } from '../services/telegram/telegram.service.js';
import logger from '../config/logger.js';

const CLIENT_ERROR_PREFIXES = [
  'chatId',
  'brandId',
  'Brand not found',
  'This Telegram chat is already registered',
  'Telegram chat not found',
  'Telegram chat id must be a number',
];

class TelegramChatController {
  handleError(res, error, fallback = 'An error occurred') {
    logger.error(`${fallback}:`, error);
    const isClient = CLIENT_ERROR_PREFIXES.some((p) => error.message?.startsWith(p));
    const isNotFound = error.message === 'Telegram chat not found';
    return res.status(isNotFound ? 404 : isClient ? 400 : 500).json({
      success: false,
      message: error.message || fallback,
    });
  }

  list = async (req, res) => {
    try {
      const chats = await telegramChatService.list({
        brandId: req.query.brandId,
        isActive: req.query.isActive,
      });
      return res.json({ success: true, data: chats });
    } catch (error) {
      return this.handleError(res, error, 'Failed to list Telegram chats');
    }
  };

  getById = async (req, res) => {
    try {
      const chat = await telegramChatService.getById(req.params.id);
      return res.json({ success: true, data: chat });
    } catch (error) {
      return this.handleError(res, error, 'Failed to fetch Telegram chat');
    }
  };

  create = async (req, res) => {
    try {
      const chat = await telegramChatService.create(req.body);
      return res.status(201).json({ success: true, data: chat });
    } catch (error) {
      return this.handleError(res, error, 'Failed to register Telegram chat');
    }
  };

  update = async (req, res) => {
    try {
      const chat = await telegramChatService.update(req.params.id, req.body);
      return res.json({ success: true, data: chat });
    } catch (error) {
      return this.handleError(res, error, 'Failed to update Telegram chat');
    }
  };

  remove = async (req, res) => {
    try {
      await telegramChatService.remove(req.params.id);
      return res.json({ success: true, message: 'Telegram chat removed' });
    } catch (error) {
      return this.handleError(res, error, 'Failed to remove Telegram chat');
    }
  };

  /** Send a plain test message to exactly this one chat — no report data. */
  test = async (req, res) => {
    try {
      const chat = await telegramChatService.getById(req.params.id);

      if (!telegramService.enabled) {
        return res.status(400).json({
          success: false,
          message: 'Telegram bot is not configured. Set TELEGRAM_BOT_TOKEN.',
        });
      }

      const result = await telegramService.sendMessageToChat(
        chat.chatId,
        `✅ <b>Test message</b>\nThis chat is registered for brand <b>${chat.brand.name}</b>.`,
      );

      if (!result.sent) {
        return res.status(502).json({
          success: false,
          message: 'Failed to send Telegram test message',
          error: result.error,
        });
      }

      return res.json({
        success: true,
        message: `Test message sent to chat for brand "${chat.brand.name}"`,
      });
    } catch (error) {
      return this.handleError(res, error, 'Failed to send Telegram test message');
    }
  };
}

export default new TelegramChatController();
