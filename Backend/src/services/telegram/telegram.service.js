import { Telegraf } from 'telegraf';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_CHATS = process.env.ALLOWED_CHAT_IDS?.split(',').map(Number) || [];

class TelegramService {
  constructor() {
    if (!BOT_TOKEN) {
      console.warn('Telegram bot token missing. Notifications disabled.');
      return;
    }
    this.bot = new Telegraf(BOT_TOKEN);
  }

 async sendDocument(documentBuffer, filename, caption = '') {
   if (!this.enabled) return;
   for (const chatId of ALLOWED_CHATS) {
     try {
       await this.bot.telegram.sendDocument(
         chatId,
         { source: documentBuffer, filename },
         { caption, parse_mode: 'HTML' }
       );
     } catch (err) {
       console.error(`Telegram document send error (chat ${chatId}):`, err.message);
     }
   }
 }

  async sendMessage(text, parseMode = 'HTML') {
    for (const chatId of ALLOWED_CHATS) {
      try {
        await this.bot.telegram.sendMessage(chatId, text, { parse_mode: parseMode });
      } catch (err) {
        console.error(`Telegram send error (chat ${chatId}):`, err.message);
      }
    }
  }

  // Expose bot instance for commands
  getBot() {
    return this.bot;
  }

  launch() {
    if (this.bot) {
      this.bot.launch();
      console.log('🤖 Telegram bot started.');
    }
  }
}

export const telegramService = new TelegramService();