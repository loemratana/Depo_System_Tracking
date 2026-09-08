// src/services/telegram/telegram.scheduler.js
import cron from 'node-cron';
import { telegramService } from './telegram.service.js';
import {
  TELEGRAM_REPORT_CATALOG,
  isReportEnabled,
} from './telegram.settings.js';
import { buildReportPackage } from './telegram.alert-reports.js';
import telegramChatService from '../telegramChatService.js';
import logger from '../../config/logger.js';

/** Mask a chat id for logs — keep enough to debug, not the full identifier. */
function maskChatId(chatId) {
  const s = String(chatId);
  if (s.length <= 4) return '*'.repeat(s.length);
  return `${s.slice(0, 2)}***${s.slice(-2)}`;
}

async function deliverToChat({ reportId, brand, pkg, telegramChat }) {
  const result = await telegramService.sendReportPackageToChat(telegramChat.chatId, pkg);
  if (result.sent) {
    logger.info(
      `Telegram report sent: report=${reportId} brand=${brand.id}(${brand.name}) chat=${maskChatId(telegramChat.chatId)}`,
    );
  } else {
    logger.error(
      `Telegram report FAILED: report=${reportId} brand=${brand.id}(${brand.name}) chat=${maskChatId(telegramChat.chatId)} error=${result.error}`,
    );
  }
  return result;
}

/**
 * For one report id: find every brand that has at least one active
 * TelegramChat, build ONE brand-scoped package per brand, and fan it out to
 * that brand's chat(s) only. A failure delivering to one chat/brand never
 * stops delivery to the others.
 */
async function runReport(reportId) {
  if (!isReportEnabled(reportId)) {
    logger.info(`Telegram skip (disabled): ${reportId}`);
    return { skipped: true, reason: 'disabled' };
  }
  if (!telegramService.enabled) {
    logger.warn(`Telegram not configured — skip ${reportId}`);
    return { skipped: true, reason: 'bot_not_configured' };
  }

  const brandChats = await telegramChatService.listActiveBrandsWithChats();
  if (brandChats.length === 0) {
    logger.info(`Telegram skip (no registered chats): ${reportId}`);
    return { skipped: true, reason: 'no_chats' };
  }

  logger.info(`Running Telegram report: ${reportId} → ${brandChats.length} brand(s)`);

  const summary = { reportId, sent: 0, failed: 0, skippedBrands: 0 };

  for (const { brand, chats } of brandChats) {
    let pkg;
    try {
      pkg = await buildReportPackage(reportId, { brandId: brand.id });
    } catch (err) {
      logger.error(
        `Telegram report build FAILED: report=${reportId} brand=${brand.id}(${brand.name}) error=${err.message}`,
      );
      summary.skippedBrands += 1;
      continue; // one brand's build failure must not stop the others
    }

    for (const telegramChat of chats) {
      const result = await deliverToChat({ reportId, brand, pkg, telegramChat });
      if (result.sent) summary.sent += 1;
      else summary.failed += 1;
    }
  }

  logger.info(
    `Telegram report done: ${reportId} sent=${summary.sent} failed=${summary.failed} skippedBrands=${summary.skippedBrands}`,
  );
  return summary;
}

export function setupSchedulers() {
  // Group catalog items by cron expression so we don't register duplicates
  const byCron = new Map();
  for (const report of TELEGRAM_REPORT_CATALOG) {
    if (!byCron.has(report.cron)) byCron.set(report.cron, []);
    byCron.get(report.cron).push(report.id);
  }

  const tz = process.env.TELEGRAM_CRON_TZ || 'Asia/Phnom_Penh';

  for (const [cronExpr, reportIds] of byCron.entries()) {
    cron.schedule(
      cronExpr,
      async () => {
        for (const id of reportIds) {
          await runReport(id);
        }
      },
      { timezone: tz },
    );
    logger.info('Telegram cron job registered', {
      action: 'telegram.cron.registered',
      cronExpr,
      timezone: tz,
      reportIds,
    });
  }
}

export { runReport };
