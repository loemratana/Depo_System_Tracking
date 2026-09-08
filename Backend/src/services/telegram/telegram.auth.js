// src/services/telegram/telegram.auth.js
import telegramChatService from '../telegramChatService.js';
import logger from '../../config/logger.js';

// Identical wording for "not registered" and "inactive" — never leak which
// one it is, and never leak that other brands/chats exist.
const DENY_MESSAGE =
  '🔒 This chat is not authorized to use this bot. Contact your administrator.';

/**
 * Centralized inbound authorization for the Telegram bot. Every command and
 * button callback must go through this — never resolve brandId any other
 * way (and NEVER from user-supplied command text).
 *
 * Registered as bot-level Telegraf middleware: resolves ctx.chat.id against
 * TelegramChat, attaches { brandId, brandName, telegramChat } to ctx.state
 * on success, and short-circuits (denies) otherwise.
 */
export function chatAuthMiddleware() {
  return async (ctx, next) => {
    const chatId = ctx.chat?.id;
    if (chatId === undefined || chatId === null) {
      // No chat on this update (e.g. inline query) — nothing to authorize against.
      return next();
    }

    const context = await telegramChatService.getTelegramChatContext(chatId);

    if (!context.authorized) {
      logger.warn(
        `Telegram inbound denied: chat=${chatId} reason=${context.reason}`,
      );
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery('Not authorized', { show_alert: true }).catch(() => {});
      } else {
        await ctx.reply(DENY_MESSAGE).catch(() => {});
      }
      return; // do not call next() — handler never runs
    }

    ctx.state = ctx.state || {};
    ctx.state.brandId = context.brandId;
    ctx.state.brandName = context.telegramChat.brand?.name || null;
    ctx.state.telegramChat = context.telegramChat;

    return next();
  };
}
