import { telegramService } from './telegram.service.js';
import { setupCommands } from './telegram.commands.js';
import { setupSchedulers } from './telegram.scheduler.js';

export function startTelegramBot() {
  try {
    setupCommands();
    setupSchedulers();
    telegramService.launch();
  } catch (err) {
    console.error('Failed to start Telegram bot:', err);
  }
}