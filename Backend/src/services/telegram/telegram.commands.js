// src/services/telegram/telegram.commands.js
import { telegramService } from "./telegram.service.js";
import { chatAuthMiddleware } from "./telegram.auth.js";
import {
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyKPIReport,
  getEmployeePerformance,
  getDailyReportData,
  getWeeklyReportData,
  getMonthlyKPIData,
} from "./telegram.reports.js";
import {
  generateDailyExcel,
  generateWeeklyExcel,
  generateMonthlyKPIExcel,
} from "./telegram.excel.js";
import {
  mainMenu,
  reportOptions,
  employeePrompt,
  backToMenu,
} from "./telegram.keyboards.js";

export function setupCommands() {
  const bot = telegramService.getBot();
  if (!bot) return;

  // Every command/action below runs only for chats registered in
  // TelegramChat (isActive = true). ctx.state.brandId is the ONLY source of
  // brand scoping for everything that follows — never derive it from
  // command arguments.
  bot.use(chatAuthMiddleware());

  // ─── /start ────────────────────────────────────────────────
  bot.command("start", async (ctx) => {
    const welcome = `
👋 Welcome to the <b>Depot Management Bot</b>!

I provide <b>PO / KPI</b> depot performance snapshots and employee rankings for <b>${ctx.state.brandName || "your brand"}</b> — same data as KPI Management.

Use the buttons below, or type /help for commands.
    `;
    await ctx.reply(welcome, { parse_mode: "HTML", ...mainMenu() });
  });

  // ─── /menu ─────────────────────────────────────────────────
  bot.command("menu", async (ctx) => {
    await ctx.reply("📌 <b>Main Menu</b> – choose an option:", {
      parse_mode: "HTML",
      ...mainMenu(),
    });
  });

  // ─── /help ─────────────────────────────────────────────────
  bot.command("help", async (ctx) => {
    const help = `
<b>🤖 Available Commands</b>

/menu – Show interactive menu
/daily – Daily PO snapshot (MTD)
/weekly – Employee PO % rankings (MTD)
/monthly – Monthly depot × brand KPI
/kpi &lt;id&gt; – Employee KPI detail
    `;
    await ctx.reply(help, { parse_mode: "HTML", ...backToMenu() });
  });

  // ─────────────────────────────────────────────────────────────
  //  CALLBACK HANDLERS
  // ─────────────────────────────────────────────────────────────

  bot.action("menu", async (ctx) => {
    await ctx.editMessageText("📌 <b>Main Menu</b> – choose an option:", {
      parse_mode: "HTML",
      ...mainMenu(),
    });
    await ctx.answerCbQuery();
  });

  bot.action("help", async (ctx) => {
    const help = `
<b>🤖 Available Commands</b>

/menu – Show interactive menu
/daily – Daily PO snapshot (MTD)
/weekly – Employee PO % rankings (MTD)
/monthly – Monthly depot × brand KPI
/kpi &lt;id&gt; – Employee KPI detail
    `;
    await ctx.editMessageText(help, { parse_mode: "HTML", ...backToMenu() });
    await ctx.answerCbQuery();
  });

  // ─── Report menus ──────────────────────────────────────────
  bot.action("daily_menu", async (ctx) => {
    await ctx.editMessageText("📊 <b>Daily PO Snapshot</b>\nChoose format:", {
      parse_mode: "HTML",
      ...reportOptions("daily"),
    });
    await ctx.answerCbQuery();
  });

  bot.action("weekly_menu", async (ctx) => {
    await ctx.editMessageText("📈 <b>Weekly Rankings</b>\nChoose format:", {
      parse_mode: "HTML",
      ...reportOptions("weekly"),
    });
    await ctx.answerCbQuery();
  });

  bot.action("monthly_menu", async (ctx) => {
    await ctx.editMessageText("📋 <b>Monthly Depot KPI</b>\nChoose format:", {
      parse_mode: "HTML",
      ...reportOptions("monthly"),
    });
    await ctx.answerCbQuery();
  });

  bot.action("kpi_prompt", async (ctx) => {
    await ctx.editMessageText(
      "👤 <b>Employee KPI</b>\nPlease enter the employee ID (e.g., /kpi 123) or use the button below to cancel.",
      { parse_mode: "HTML", ...employeePrompt() },
    );
    await ctx.answerCbQuery();
  });

  // ─── Generate reports (text) ──────────────────────────────
  bot.action("daily_text", async (ctx) => {
    const report = await generateDailyReport({ brandId: ctx.state.brandId });
    await ctx.editMessageText(report, { parse_mode: "HTML", ...backToMenu() });
    await ctx.answerCbQuery();
  });

  bot.action("weekly_text", async (ctx) => {
    const report = await generateWeeklyReport({ brandId: ctx.state.brandId });
    await ctx.editMessageText(report, { parse_mode: "HTML", ...backToMenu() });
    await ctx.answerCbQuery();
  });

  bot.action("monthly_text", async (ctx) => {
    const report = await generateMonthlyKPIReport({ brandId: ctx.state.brandId });
    await ctx.editMessageText(report, { parse_mode: "HTML", ...backToMenu() });
    await ctx.answerCbQuery();
  });

  // ─── Generate reports (Excel) ──────────────────────────────
  bot.action("daily_excel", async (ctx) => {
    const data = await getDailyReportData({ brandId: ctx.state.brandId });
    const buffer = await generateDailyExcel(data);
    await ctx.replyWithDocument(
      {
        source: buffer,
        filename: `daily_po_${new Date().toISOString().slice(0, 10)}.xlsx`,
      },
      { caption: "📊 Daily PO Snapshot" },
    );
    await ctx.editMessageText("✅ Excel sent!", { ...backToMenu() });
    await ctx.answerCbQuery();
  });

  bot.action("weekly_excel", async (ctx) => {
    const data = await getWeeklyReportData({ brandId: ctx.state.brandId });
    const buffer = await generateWeeklyExcel(data);
    await ctx.replyWithDocument(
      {
        source: buffer,
        filename: `weekly_rankings_${new Date().toISOString().slice(0, 10)}.xlsx`,
      },
      { caption: "📈 Weekly Employee Rankings" },
    );
    await ctx.editMessageText("✅ Excel sent!", { ...backToMenu() });
    await ctx.answerCbQuery();
  });

  bot.action("monthly_excel", async (ctx) => {
    const data = await getMonthlyKPIData({ brandId: ctx.state.brandId });
    const buffer = await generateMonthlyKPIExcel(data);
    await ctx.replyWithDocument(
      {
        source: buffer,
        filename: `monthly_depot_kpi_${new Date().toISOString().slice(0, 7)}.xlsx`,
      },
      { caption: "📋 Monthly Depot KPI" },
    );
    await ctx.editMessageText("✅ Excel sent!", { ...backToMenu() });
    await ctx.answerCbQuery();
  });

  // ─── Text commands ─────────────────────────────────────────
  bot.command("daily", async (ctx) => {
    const report = await generateDailyReport({ brandId: ctx.state.brandId });
    await ctx.reply(report, { parse_mode: "HTML", ...backToMenu() });
  });

  bot.command("weekly", async (ctx) => {
    const report = await generateWeeklyReport({ brandId: ctx.state.brandId });
    await ctx.reply(report, { parse_mode: "HTML", ...backToMenu() });
  });

  bot.command("monthly", async (ctx) => {
    const report = await generateMonthlyKPIReport({ brandId: ctx.state.brandId });
    await ctx.reply(report, { parse_mode: "HTML", ...backToMenu() });
  });

  bot.command("kpi", async (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
      await ctx.reply("Please provide an employee ID: /kpi 123", {
        ...backToMenu(),
      });
      return;
    }
    const empId = parseInt(args[1]);
    if (isNaN(empId)) {
      await ctx.reply("Invalid employee ID.", { ...backToMenu() });
      return;
    }
    // brandId comes from the authorized chat, never from the command text —
    // an employee outside this chat's brand yields "no records found" below,
    // not another brand's data.
    const data = await getEmployeePerformance(empId, { brandId: ctx.state.brandId });
    await ctx.reply(data, { parse_mode: "HTML", ...backToMenu() });
  });

  bot.command("test_reports", async (ctx) => {
    const { brandId } = ctx.state;
    await ctx.reply("🧪 Running scheduled reports manually...");
    const daily = await generateDailyReport({ brandId });
    await ctx.reply(daily, { parse_mode: "HTML" });
    const weekly = await generateWeeklyReport({ brandId });
    await ctx.reply(weekly, { parse_mode: "HTML" });
    const monthly = await generateMonthlyKPIReport({ brandId });
    await ctx.reply(monthly, { parse_mode: "HTML" });
    await ctx.reply("✅ All reports sent.");
  });
}
