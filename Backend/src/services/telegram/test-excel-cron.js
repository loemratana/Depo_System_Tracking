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

const { buildReportPackage } = await import('./telegram.alert-reports.js');
const { telegramService } = await import('./telegram.service.js');

const reportIds = process.argv.slice(2);
const idsToTest = reportIds.length
  ? reportIds
  : ['license.daily', 'kpi.monthly.depot'];

console.log('📢 Testing Excel report packages → Telegram...');
console.log(`   Chats: ${chats}`);
console.log(`   Reports: ${idsToTest.join(', ')}`);

try {
  for (const reportId of idsToTest) {
    console.log(`→ Building "${reportId}"...`);
    const pkg = await buildReportPackage(reportId);
    console.log(`   filename: ${pkg.filename}`);
    const result = await telegramService.sendReportPackage(pkg);
    console.log(`   sent: ${result.sent}, errors: ${JSON.stringify(result.errors)}`);
  }
  console.log('✅ Done. Check Telegram for the Excel attachments.');
} catch (err) {
  console.error('❌ Failed:', err.message);
  process.exit(1);
} finally {
  process.exit(0);
}
