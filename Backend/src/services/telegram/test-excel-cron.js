// Manual dev script — builds Excel report packages and sends them to every
// brand that has an active TelegramChat registered (via the admin API /
// Prisma Studio). Run: node src/services/telegram/test-excel-cron.js [reportId...]
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN is missing in .env / .env.local');
  process.exit(1);
}

const { buildReportPackage } = await import('./telegram.alert-reports.js');
const { telegramService } = await import('./telegram.service.js');
const { default: telegramChatService } = await import('../telegramChatService.js');

const brandChats = await telegramChatService.listActiveBrandsWithChats();

if (brandChats.length === 0) {
  console.error(
    '❌ No active TelegramChat rows found. Register one via the admin API (POST /api/v1/telegram/chats) first.',
  );
  process.exit(1);
}

const reportIds = process.argv.slice(2);
const idsToTest = reportIds.length
  ? reportIds
  : ['license.daily', 'kpi.monthly.depot'];

console.log('📢 Testing Excel report packages → Telegram (per brand)...');
console.log(`   Reports: ${idsToTest.join(', ')}`);

try {
  for (const { brand, chats } of brandChats) {
    console.log(`→ Brand "${brand.name}" (#${brand.id}) — ${chats.length} chat(s)`);
    for (const reportId of idsToTest) {
      console.log(`  building "${reportId}"...`);
      const pkg = await buildReportPackage(reportId, { brandId: brand.id });
      console.log(`    filename: ${pkg.filename}`);
      for (const chat of chats) {
        const result = await telegramService.sendReportPackageToChat(chat.chatId, pkg);
        console.log(`    chat ${chat.id}: sent=${result.sent} error=${result.error || ''}`);
      }
    }
  }
  console.log('✅ Done. Check Telegram for the Excel attachments.');
} catch (err) {
  console.error('❌ Failed:', err.message);
  process.exit(1);
} finally {
  process.exit(0);
}
