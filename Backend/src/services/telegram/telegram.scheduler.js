// src/services/telegram/telegram.scheduler.js
import cron from 'node-cron';
import { telegramService } from './telegram.service.js';
import {
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyKPIReport,
  getLowStockAlertMessage,
} from './telegram.reports.js';

export function setupSchedulers() {
  // ── Daily report at 09:00 ─────────────────────────────────
  cron.schedule('0 9 * * *', async () => {
    console.log('🕒 Running daily report...');

    const report = await generateDailyReport();
    await telegramService.sendMessage(report);
  });

  // ── Weekly report every Monday at 10:00 ──────────────────
  cron.schedule('0 10 * * 1', async () => {
    const report = await generateWeeklyReport();
    await telegramService.sendMessage(report);
  });

  // ── Monthly KPI report on the 1st at 10:00 ───────────────
  cron.schedule('0 10 1 * *', async () => {
    const report = await generateMonthlyKPIReport();
    await telegramService.sendMessage(report);
  });

  // ── Low stock check every 6 hours ──────────────────────────
  cron.schedule('0 */6 * * *', async () => {
    const msg = await getLowStockAlertMessage();
    // Only send if there are low stock items (message not the "healthy" one)
    if (!msg.startsWith('✅')) {
      await telegramService.sendMessage(msg);
    }
  });
}