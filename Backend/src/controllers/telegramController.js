import {
  getTelegramSettings,
  saveTelegramSettings,
  getReportDef,
} from '../services/telegram/telegram.settings.js';
import { buildReportPackage } from '../services/telegram/telegram.alert-reports.js';
import { telegramService } from '../services/telegram/telegram.service.js';
import telegramChatService from '../services/telegramChatService.js';
import logger from '../config/logger.js';

class TelegramController {
  getSettings = async (_req, res) => {
    try {
      const settings = getTelegramSettings();
      const activeChats = await telegramChatService.list({ isActive: true });
      const brandsConnected = new Set(activeChats.map((c) => c.brandId)).size;
      return res.json({
        success: true,
        data: {
          ...settings,
          chatConfigured: activeChats.length > 0,
          activeChatCount: activeChats.length,
          brandsConnected,
        },
      });
    } catch (error) {
      logger.error('Get telegram settings error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to load telegram settings',
      });
    }
  };

  updateSettings = async (req, res) => {
    try {
      const enabled = req.body?.enabled;
      if (!enabled || typeof enabled !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Body must include { enabled: { [reportId]: boolean } }',
        });
      }
      const settings = saveTelegramSettings(enabled);
      return res.json({
        success: true,
        message: 'Telegram notification settings saved',
        data: settings,
      });
    } catch (error) {
      logger.error('Update telegram settings error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to save telegram settings',
      });
    }
  };

  /**
   * Sends one report package to exactly one registered Telegram chat — the
   * report is built scoped to that chat's brand only. There is no broadcast
   * path any more: a brandId/chatId must always be explicit.
   */
  testSend = async (req, res) => {
    try {
      const reportId = req.params.reportId || req.body?.reportId;
      const def = getReportDef(reportId);
      if (!def) {
        return res.status(404).json({
          success: false,
          message: `Unknown report id: ${reportId}`,
        });
      }

      if (!telegramService.enabled) {
        return res.status(400).json({
          success: false,
          message: 'Telegram bot is not configured. Set TELEGRAM_BOT_TOKEN.',
        });
      }

      const telegramChatId = req.body?.telegramChatId;
      if (!telegramChatId) {
        return res.status(400).json({
          success: false,
          message: 'telegramChatId is required — select which registered chat to test',
        });
      }

      const chat = await telegramChatService.getById(telegramChatId);
      if (!chat.isActive) {
        return res.status(400).json({
          success: false,
          message: 'This Telegram chat is inactive',
        });
      }

      const pkg = await buildReportPackage(reportId, { brandId: chat.brandId });
      const result = await telegramService.sendReportPackageToChat(chat.chatId, pkg);

      if (!result.sent) {
        return res.status(502).json({
          success: false,
          message: 'Failed to send Telegram Excel report',
          error: result.error,
        });
      }

      return res.json({
        success: true,
        message: `Sent "${def.name}" to the chat for brand "${chat.brand.name}"`,
        data: {
          reportId,
          filename: pkg.filename,
          brandId: chat.brandId,
          telegramChatId: chat.id,
        },
      });
    } catch (error) {
      logger.error('Telegram test send error:', error);
      const status = error.message === 'Telegram chat not found' ? 404 : 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Failed to send test report',
      });
    }
  };
}

export default new TelegramController();
