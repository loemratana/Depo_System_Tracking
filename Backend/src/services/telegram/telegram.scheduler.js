// src/services/telegram/telegram.scheduler.js
import cron from 'node-cron';
import { telegramService } from './telegram.service.js';
import {
  TELEGRAM_REPORT_CATALOG,
  isReportEnabled,
} from './telegram.settings.js';
import { buildReportPackage } from './telegram.alert-reports.js';

async function runReport(reportId) {
  if (!isReportEnabled(reportId)) {
    console.log(`⏭ Telegram skip (disabled): ${reportId}`);
    return;
  }
  if (!telegramService.enabled) {
    console.warn(`⚠ Telegram not configured — skip ${reportId}`);
    return;
  }

  console.log(`🕒 Running Telegram report: ${reportId}`);
  try {
    const pkg = await buildReportPackage(reportId);
    const result = await telegramService.sendReportPackage(pkg);
    if (result.errors?.length) {
      console.error(`Telegram report ${reportId} partial fail:`, result.errors);
    } else {
      console.log(
        `✅ Telegram report sent: ${reportId} (${pkg.filename}) → ${result.sent} chat(s)`,
      );
    }
  } catch (err) {
    console.error(`❌ Telegram report ${reportId} failed:`, err.message);
  }
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
    console.log(
      `📅 Telegram cron "${cronExpr}" (${tz}) → ${reportIds.join(', ')}`,
    );
  }
}

export { runReport };
