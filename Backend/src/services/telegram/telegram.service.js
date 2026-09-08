import { Telegraf } from 'telegraf';
import logger from '../../config/logger.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * Thin Telegraf wrapper. Every send here targets exactly ONE chat — this
 * service has no concept of "all configured chats" any more. Routing
 * (which chat(s) a report goes to) is decided by the caller using
 * telegramChatService, never here.
 */
class TelegramService {
  constructor() {
    if (!BOT_TOKEN) {
      logger.warn('Telegram bot token missing, notifications disabled');
      this.bot = null;
      return;
    }
    this.bot = new Telegraf(BOT_TOKEN);
  }

  /** Bot is configured (token present). Does NOT imply any chat is registered. */
  get enabled() {
    return Boolean(this.bot);
  }

  /** Telegram caption hard limit is 1024 chars; cut on a line boundary. */
  #safeCaption(caption) {
    const rawCaption = String(caption || '');
    if (rawCaption.length <= 1024) return rawCaption || undefined;
    let cut = rawCaption.lastIndexOf('\n', 1000);
    if (cut < 500) cut = 1000;
    return `${rawCaption.slice(0, cut)}\n… (see Excel)`;
  }

  #chunkMessage(text, max = 4000) {
    const chunks = [];
    let remaining = String(text || '');
    while (remaining.length > max) {
      let cut = remaining.lastIndexOf('\n', max);
      if (cut < max * 0.5) cut = max;
      chunks.push(remaining.slice(0, cut));
      remaining = remaining.slice(cut).replace(/^\n+/, '');
    }
    if (remaining) chunks.push(remaining);
    return chunks;
  }

  /** Send a text message to exactly one chat. */
  async sendMessageToChat(chatId, text, parseMode = 'HTML') {
    if (!this.bot) {
      return { sent: false, error: 'TELEGRAM_BOT_TOKEN is missing' };
    }
    if (!chatId) {
      return { sent: false, error: 'chatId is required' };
    }

    try {
      for (const chunk of this.#chunkMessage(text)) {
        await this.bot.telegram.sendMessage(chatId, chunk, { parse_mode: parseMode });
      }
      return { sent: true };
    } catch (err) {
      logger.error(`Telegram send error (chat ${chatId}): ${err.message}`);
      return { sent: false, error: err.message };
    }
  }

  /** Send a document to exactly one chat. */
  async sendDocumentToChat(chatId, documentBuffer, filename, caption = '') {
    if (!this.bot) {
      return { sent: false, error: 'TELEGRAM_BOT_TOKEN is missing' };
    }
    if (!chatId) {
      return { sent: false, error: 'chatId is required' };
    }

    const buffer = Buffer.isBuffer(documentBuffer)
      ? documentBuffer
      : Buffer.from(documentBuffer);
    const safeCaption = this.#safeCaption(caption);

    try {
      await this.bot.telegram.sendDocument(
        chatId,
        { source: buffer, filename },
        { caption: safeCaption, parse_mode: safeCaption ? 'HTML' : undefined },
      );
      return { sent: true };
    } catch (err) {
      logger.error(`Telegram document send error (chat ${chatId}): ${err.message}`);
      return { sent: false, error: err.message };
    }
  }

  /** Send a { buffer, filename, caption } report package to exactly one chat. */
  async sendReportPackageToChat(chatId, { buffer, filename, caption }) {
    return this.sendDocumentToChat(chatId, buffer, filename, caption);
  }

  getBot() {
    return this.bot;
  }

  launch() {
    if (this.bot) {
      this.bot
        .launch({ dropPendingUpdates: true })
        .then(() => logger.info('Telegram bot started'))
        .catch((err) => {
          logger.error('Telegram bot failed to start', { err });
        });
    }
  }

  stop(reason = 'SIGTERM') {
    if (this.bot) {
      this.bot.stop(reason);
    }
  }
}

export const telegramService = new TelegramService();
export { TelegramService };
