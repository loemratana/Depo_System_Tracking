// Manual dev script — sends the 3 core text reports to every brand that has
// an active TelegramChat registered (via the admin API / Prisma Studio).
// Run: node src/services/telegram/test-cron.js
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN is missing in .env / .env.local');
  process.exit(1);
}

const { generateDailyReport, generateWeeklyReport, generateMonthlyKPIReport } =
  await import('./telegram.reports.js');
const { telegramService } = await import('./telegram.service.js');
const { default: telegramChatService } = await import('../telegramChatService.js');

const brandChats = await telegramChatService.listActiveBrandsWithChats();

if (brandChats.length === 0) {
  console.error(
    '❌ No active TelegramChat rows found. Register one via the admin API (POST /api/v1/telegram/chats) first.',
  );
  process.exit(1);
}

console.log('📢 Testing cron reports → Telegram (per brand)...');

try {
  for (const { brand, chats } of brandChats) {
    console.log(`→ Brand "${brand.name}" (#${brand.id}) — ${chats.length} chat(s)`);
    const daily = await generateDailyReport({ brandId: brand.id });
    const weekly = await generateWeeklyReport({ brandId: brand.id });
    const monthly = await generateMonthlyKPIReport({ brandId: brand.id });

    for (const chat of chats) {
      await telegramService.sendMessageToChat(chat.chatId, daily);
      await telegramService.sendMessageToChat(chat.chatId, weekly);
      await telegramService.sendMessageToChat(chat.chatId, monthly);
    }
  }
  console.log('✅ Done. Check Telegram for the messages.');
} catch (err) {
  console.error('❌ Failed:', err.message);
  process.exit(1);
} finally {
  process.exit(0);
}
