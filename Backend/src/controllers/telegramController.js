import {
  getTelegramSettings,
  saveTelegramSettings,
  getReportDef,
} from '../services/telegram/telegram.settings.js';
import { buildReportPackage } from '../services/telegram/telegram.alert-reports.js';
import { telegramService } from '../services/telegram/telegram.service.js';
import logger from '../config/logger.js';

class TelegramController {
  getSettings = async (_req, res) => {
    try {
      const settings = getTelegramSettings();
      return res.json({ success: true, data: settings });
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
          message:
            'Telegram is not configured. Set TELEGRAM_BOT_TOKEN and ALLOWED_CHAT_IDS in .env.local',
        });
      }

      const pkg = await buildReportPackage(reportId);
      const result = await telegramService.sendReportPackage(pkg);

      if (!result.sent) {
        return res.status(502).json({
          success: false,
          message: 'Failed to send Telegram Excel report',
          errors: result.errors,
        });
      }

      return res.json({
        success: true,
        message: `Sent "${def.name}" Excel to ${result.sent} chat(s)`,
        data: {
          reportId,
          filename: pkg.filename,
          sent: result.sent,
          chats: telegramService.getChatIds(),
          errors: result.errors,
        },
      });
    } catch (error) {
      logger.error('Telegram test send error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to send test report',
      });
    }
  };
}

export default new TelegramController();
