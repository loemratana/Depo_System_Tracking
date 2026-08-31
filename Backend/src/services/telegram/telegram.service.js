import { Telegraf } from 'telegraf';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_CHATS =
  process.env.ALLOWED_CHAT_IDS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => !Number.isNaN(n)) || [];

class TelegramService {
  constructor() {
    if (!BOT_TOKEN) {
      console.warn('Telegram bot token missing. Notifications disabled.');
      this.bot = null;
      return;
    }
    this.bot = new Telegraf(BOT_TOKEN);
  }

  get enabled() {
    return Boolean(this.bot && ALLOWED_CHATS.length > 0);
  }

  getChatIds() {
    return [...ALLOWED_CHATS];
  }

  async sendDocument(documentBuffer, filename, caption = '') {
    if (!this.bot) {
      return { sent: 0, errors: ['TELEGRAM_BOT_TOKEN is missing'] };
    }
    if (!ALLOWED_CHATS.length) {
      return { sent: 0, errors: ['ALLOWED_CHAT_IDS is missing'] };
    }

    const buffer = Buffer.isBuffer(documentBuffer)
      ? documentBuffer
      : Buffer.from(documentBuffer);
    // Telegram caption hard limit is 1024; cut on a line boundary so an HTML tag never gets split
    const rawCaption = String(caption || '');
    let safeCaption = rawCaption;
    if (rawCaption.length > 1024) {
      let cut = rawCaption.lastIndexOf('\n', 1000);
      if (cut < 500) cut = 1000;
      safeCaption = `${rawCaption.slice(0, cut)}\n… (see Excel)`;
    }

    const errors = [];
    let sent = 0;
    for (const chatId of ALLOWED_CHATS) {
      try {
        await this.bot.telegram.sendDocument(
          chatId,
          { source: buffer, filename },
          {
            caption: safeCaption || undefined,
            parse_mode: safeCaption ? 'HTML' : undefined,
          },
        );
        sent += 1;
      } catch (err) {
        console.error(`Telegram document send error (chat ${chatId}):`, err.message);
        errors.push(`chat ${chatId}: ${err.message}`);
      }
    }
    return { sent, errors };
  }

  /** Send report package: Excel file + summary caption */
  async sendReportPackage({ buffer, filename, caption }) {
    return this.sendDocument(buffer, filename, caption);
  }

  async sendMessage(text, parseMode = 'HTML') {
    if (!this.bot) {
      return { sent: 0, errors: ['TELEGRAM_BOT_TOKEN is missing'] };
    }
    if (!ALLOWED_CHATS.length) {
      return { sent: 0, errors: ['ALLOWED_CHAT_IDS is missing'] };
    }

    // Telegram hard limit is 4096 characters per message
    const chunks = [];
    const max = 4000;
    let remaining = String(text || '');
    while (remaining.length > max) {
      let cut = remaining.lastIndexOf('\n', max);
      if (cut < max * 0.5) cut = max;
      chunks.push(remaining.slice(0, cut));
      remaining = remaining.slice(cut).replace(/^\n+/, '');
    }
    if (remaining) chunks.push(remaining);

    const errors = [];
    let sent = 0;
    for (const chatId of ALLOWED_CHATS) {
      try {
        for (const chunk of chunks) {
          await this.bot.telegram.sendMessage(chatId, chunk, {
            parse_mode: parseMode,
          });
        }
        sent += 1;
      } catch (err) {
        console.error(`Telegram send error (chat ${chatId}):`, err.message);
        errors.push(`chat ${chatId}: ${err.message}`);
      }
    }
    return { sent, errors };
  }

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
