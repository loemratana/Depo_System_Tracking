import { prisma } from "../config/db.js";
import logger from "../config/logger.js";

/**
 * Source of truth for Brand <-> Telegram chat routing and inbound
 * authorization. Replaces the old ALLOWED_CHAT_IDS env var: every outbound
 * send and every inbound command must resolve through this service.
 */
class TelegramChatService {
  async list({ brandId, isActive } = {}) {
    const where = {};
    if (brandId !== undefined && brandId !== null) where.brandId = Number(brandId);
    if (isActive !== undefined) where.isActive = isActive === true || isActive === "true";

    return prisma.telegramChat.findMany({
      where,
      include: { brand: { select: { id: true, name: true, code: true } } },
      orderBy: [{ brandId: "asc" }, { createdAt: "asc" }],
    });
  }

  async getById(id) {
    const chatRowId = Number(id);
    if (Number.isNaN(chatRowId)) throw new Error("Telegram chat id must be a number");

    const chat = await prisma.telegramChat.findUnique({
      where: { id: chatRowId },
      include: { brand: { select: { id: true, name: true, code: true } } },
    });
    if (!chat) throw new Error("Telegram chat not found");
    return chat;
  }

  async create({ chatId, brandId, isActive }) {
    const trimmedChatId = String(chatId || "").trim();
    if (!trimmedChatId) throw new Error("chatId is required");

    const parsedBrandId = Number(brandId);
    if (!brandId || Number.isNaN(parsedBrandId)) {
      throw new Error("brandId is required and must be a number");
    }

    const brand = await prisma.brand.findUnique({ where: { id: parsedBrandId } });
    if (!brand) throw new Error("Brand not found");

    const existing = await prisma.telegramChat.findUnique({
      where: { chatId: trimmedChatId },
    });
    if (existing) throw new Error("This Telegram chat is already registered");

    const chat = await prisma.telegramChat.create({
      data: {
        chatId: trimmedChatId,
        brandId: parsedBrandId,
        isActive: isActive === undefined ? true : Boolean(isActive),
      },
      include: { brand: { select: { id: true, name: true, code: true } } },
    });

    logger.info(`Telegram chat registered: chat=${trimmedChatId} brand=${brand.name}`);
    return chat;
  }

  async update(id, data) {
    const chatRowId = Number(id);
    if (Number.isNaN(chatRowId)) throw new Error("Telegram chat id must be a number");

    const existing = await prisma.telegramChat.findUnique({ where: { id: chatRowId } });
    if (!existing) throw new Error("Telegram chat not found");

    const updateData = {};

    if (data.chatId !== undefined) {
      const trimmedChatId = String(data.chatId || "").trim();
      if (!trimmedChatId) throw new Error("chatId cannot be empty");
      if (trimmedChatId !== existing.chatId) {
        const dup = await prisma.telegramChat.findUnique({
          where: { chatId: trimmedChatId },
        });
        if (dup) throw new Error("This Telegram chat is already registered");
      }
      updateData.chatId = trimmedChatId;
    }

    if (data.brandId !== undefined) {
      const parsedBrandId = Number(data.brandId);
      if (Number.isNaN(parsedBrandId)) throw new Error("brandId must be a number");
      const brand = await prisma.brand.findUnique({ where: { id: parsedBrandId } });
      if (!brand) throw new Error("Brand not found");
      updateData.brandId = parsedBrandId;
    }

    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

    const chat = await prisma.telegramChat.update({
      where: { id: chatRowId },
      data: updateData,
      include: { brand: { select: { id: true, name: true, code: true } } },
    });

    logger.info(
      `Telegram chat ${chatRowId} updated: ${JSON.stringify(Object.keys(updateData))}`,
    );
    return chat;
  }

  async remove(id) {
    const chatRowId = Number(id);
    if (Number.isNaN(chatRowId)) throw new Error("Telegram chat id must be a number");

    const existing = await prisma.telegramChat.findUnique({ where: { id: chatRowId } });
    if (!existing) throw new Error("Telegram chat not found");

    await prisma.telegramChat.delete({ where: { id: chatRowId } });
    logger.info(`Telegram chat ${chatRowId} deleted`);
    return { id: chatRowId };
  }

  /**
   * Active chats for one brand — used to fan out a brand-scoped report to
   * every chat that brand has registered.
   */
  async getActiveChatsForBrand(brandId) {
    return prisma.telegramChat.findMany({
      where: { brandId: Number(brandId), isActive: true },
    });
  }

  /**
   * Every brand that currently has at least one active chat — the scheduler
   * iterates this instead of "all brands" so brands with no chat configured
   * are skipped entirely (no fallback, no broadcast).
   */
  async listActiveBrandsWithChats() {
    const chats = await prisma.telegramChat.findMany({
      where: { isActive: true },
      include: { brand: { select: { id: true, name: true, code: true } } },
    });

    const byBrand = new Map();
    for (const chat of chats) {
      if (!byBrand.has(chat.brandId)) {
        byBrand.set(chat.brandId, { brand: chat.brand, chats: [] });
      }
      byBrand.get(chat.brandId).chats.push(chat);
    }
    return Array.from(byBrand.values());
  }

  /**
   * Centralized inbound authorization: resolve a Telegram chat.id to its
   * registered TelegramChat row. This is the ONLY place that turns a
   * Telegram chat into a brandId — command handlers must never derive the
   * brand from user-supplied text.
   *
   * Returns { authorized, brandId, telegramChat, reason }.
   */
  async getTelegramChatContext(chatId) {
    const lookupId = String(chatId ?? "").trim();
    if (!lookupId) {
      return { authorized: false, brandId: null, telegramChat: null, reason: "no_chat_id" };
    }

    const telegramChat = await prisma.telegramChat.findUnique({
      where: { chatId: lookupId },
      include: { brand: { select: { id: true, name: true, code: true, status: true } } },
    });

    if (!telegramChat) {
      return { authorized: false, brandId: null, telegramChat: null, reason: "not_registered" };
    }
    if (!telegramChat.isActive) {
      return { authorized: false, brandId: telegramChat.brandId, telegramChat, reason: "inactive" };
    }

    return { authorized: true, brandId: telegramChat.brandId, telegramChat, reason: null };
  }
}

export default new TelegramChatService();
