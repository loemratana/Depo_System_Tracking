import { telegramService } from './telegram.service.js';
import { setupCommands } from './telegram.commands.js';
import { setupSchedulers } from './telegram.scheduler.js';
import logger from '../../config/logger.js';

export function startTelegramBot() {
  try {
    setupCommands();
    setupSchedulers();
    telegramService.launch();
  } catch (err) {
    logger.error('Failed to start Telegram bot', { err });
  }
}