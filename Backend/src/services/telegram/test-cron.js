import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const chats = process.env.ALLOWED_CHAT_IDS;

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN is missing in .env / .env.local');
  process.exit(1);
}
if (!chats) {
  console.error('❌ ALLOWED_CHAT_IDS is missing in .env / .env.local');
  process.exit(1);
}

const { generateDailyReport, generateWeeklyReport, generateMonthlyKPIReport } =
  await import('./telegram.reports.js');
const { telegramService } = await import('./telegram.service.js');

console.log('📢 Testing cron reports → Telegram...');
console.log(`   Chats: ${chats}`);

try {
  console.log('→ Daily report...');
  await telegramService.sendMessage(await generateDailyReport());

  console.log('→ Weekly report...');
  await telegramService.sendMessage(await generateWeeklyReport());

  console.log('→ Monthly KPI report...');
  await telegramService.sendMessage(await generateMonthlyKPIReport());

  console.log('✅ Done. Check Telegram for the 3 messages.');
} catch (err) {
  console.error('❌ Failed:', err.message);
  process.exit(1);
} finally {
  process.exit(0);
}
