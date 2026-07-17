import { generateDailyReport, generateWeeklyReport, generateMonthlyKPIReport, getLowStockAlertMessage } from './src/services/telegram/telegram.reports.js';
import { telegramService } from './src/services/telegram/telegram.service.js';

(async () => {
  console.log('📢 Testing cron reports...');
  await telegramService.sendMessage(await generateDailyReport());
  await telegramService.sendMessage(await generateWeeklyReport());
  await telegramService.sendMessage(await generateMonthlyKPIReport());
  await telegramService.sendMessage(await getLowStockAlertMessage());
  console.log('✅ Done.');
})();