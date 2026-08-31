import { format, addDays, startOfDay } from 'date-fns';
import { prisma } from '../../config/db.js';
import { brandMonthlyKpiService } from '../brandMonthlyKpiService.js';
import {
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyKPIReport,
  getDailyReportData,
  getWeeklyReportData,
  getMonthlyKPIData,
} from './telegram.reports.js';
import { escapeHtml } from './telegram.formatters.js';
import {
  generateDailyExcel,
  generateWeeklyExcel,
  generateMonthlyKPIExcel,
  generateLicenseExcel,
  generateVacancyExcel,
  generateMissingKpiExcel,
  generateUnderPerformersExcel,
  generateMonthlyBrandExcel,
  generateYearlyExcel,
} from './telegram.excel.js';

function footer() {
  return `\n━━━━━━━━━━━━━━━━\n🤖 Depot Bot  •  Notifications`;
}

function nowLabel() {
  return new Date().toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function daysUntil(date) {
  const today = startOfDay(new Date());
  const target = startOfDay(new Date(date));
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function fmtPct(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(1)}%`;
}

function fmtNum(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString();
}

function dateStamp() {
  return format(new Date(), 'yyyy-MM-dd');
}

function monthStamp() {
  return format(new Date(), 'yyyy-MM');
}

/** Telegram caption max is 1024 chars. Cut on a line boundary so an HTML tag never gets split. */
function asCaption(text, max = 1000) {
  const clean = String(text || '').trim();
  if (clean.length <= max) return clean;
  let cut = clean.lastIndexOf('\n', max - 20);
  if (cut < max * 0.5) cut = max - 20;
  return `${clean.slice(0, cut)}\n… (see Excel)`;
}

async function loadDepotsForLicense() {
  return prisma.depot.findMany({
    where: {
      OR: [
        { expiryDate: { not: null } },
        { status: 'vacancy' },
        { employeeId: null },
      ],
    },
    select: {
      id: true,
      name: true,
      status: true,
      expiryDate: true,
      employeeId: true,
      brand: { select: { name: true } },
      employee: {
        select: { englishName: true, khmerName: true, phone: true },
      },
    },
    orderBy: { name: 'asc' },
  });
}

async function getLicenseAlertData(title = 'License Alert') {
  const depots = await loadDepotsForLicense();
  const today = startOfDay(new Date());
  const in7 = addDays(today, 7);
  const in14 = addDays(today, 14);
  const in30 = addDays(today, 30);

  const expired = [];
  const d7 = [];
  const d14 = [];
  const d30 = [];

  for (const d of depots) {
    if (!d.expiryDate) continue;
    const exp = startOfDay(new Date(d.expiryDate));
    if (exp.getFullYear() < 2000) continue;
    const line = {
      name: d.name,
      brand: d.brand?.name || '—',
      owner: d.employee?.englishName || d.employee?.khmerName || 'Unassigned',
      days: daysUntil(d.expiryDate),
      expiry: format(exp, 'dd MMM yyyy'),
    };
    if (exp < today) expired.push(line);
    else if (exp <= in7) d7.push(line);
    else if (exp <= in14) d14.push(line);
    else if (exp <= in30) d30.push(line);
  }

  return {
    title,
    dateLabel: format(today, 'dd MMM yyyy'),
    expired,
    d7,
    d14,
    d30,
  };
}

function formatLicenseText(data) {
  let msg = `🪪 <b>${data.title}</b>\n`;
  msg += `<i>${data.dateLabel}  •  ${nowLabel()}</i>\n\n`;
  msg += `<b>Summary</b>\n`;
  msg += `• Expired: <code>${data.expired.length}</code>\n`;
  msg += `• ≤7 days: <code>${data.d7.length}</code>\n`;
  msg += `• ≤14 days: <code>${data.d14.length}</code>\n`;
  msg += `• ≤30 days: <code>${data.d30.length}</code>\n`;
  msg += `\n📎 Full list attached as Excel.`;
  return msg + footer();
}

export async function generateLicenseDailyReport() {
  return formatLicenseText(await getLicenseAlertData('License Alert'));
}

export async function generateVacancyDailyReport() {
  const depots = await prisma.depot.findMany({
    where: {
      OR: [{ status: 'vacancy' }, { employeeId: null }],
    },
    select: {
      id: true,
      name: true,
      status: true,
      employeeId: true,
      brand: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  });

  let msg = `🏚️ <b>Vacancy Alert</b>\n`;
  msg += `<i>${format(new Date(), 'dd MMM yyyy')}  •  ${nowLabel()}</i>\n\n`;
  msg += `• Total: <code>${depots.length}</code>\n`;
  msg += `\n📎 Full list attached as Excel.`;
  return msg + footer();
}

export async function generateMissingKpiDailyReport() {
  const now = new Date();
  const insights = await brandMonthlyKpiService.getDashboardInsights({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    limit: 50,
  });
  const missing = (insights.attention || []).filter((a) =>
    ['missing_target', 'missing_available', 'missing_display'].includes(a.type),
  );

  let msg = `📝 <b>Missing KPI Entry</b>\n`;
  msg += `<i>${insights.period || ''}  •  ${nowLabel()}</i>\n\n`;
  msg += `• Attention items: <code>${missing.length}</code>\n`;
  msg += `\n📎 Full list attached as Excel.`;
  return msg + footer();
}

export async function generateWeeklyBrandSnapshot() {
  return generateDailyReport();
}

export async function generateUnderPerformersReport() {
  const report = await brandMonthlyKpiService.getBrandMonthlyReport({});
  const under = (report.rows || [])
    .filter((r) => r.poTarget != null && r.poTarget > 0 && (r.poPercent ?? 0) < 80)
    .sort((a, b) => (a.poPercent ?? 0) - (b.poPercent ?? 0));

  let msg = `⬇️ <b>Under-performers (PO % &lt; 80)</b>\n`;
  msg += `<i>${report.period} (MTD)  •  ${nowLabel()}</i>\n\n`;
  msg += `• Count: <code>${under.length}</code>\n`;
  msg += `\n📎 Full list attached as Excel.`;
  return msg + footer();
}

export async function generateLicenseWeeklyReport() {
  return formatLicenseText(await getLicenseAlertData('License Week Digest'));
}

export async function generateMonthlyBrandReport() {
  const brands = await brandMonthlyKpiService.getDashboardBrand({});
  const insights = await brandMonthlyKpiService.getDashboardInsights({
    limit: 20,
  });
  const tva = insights.targetVsActual || {};

  let msg = `📋 <b>Monthly Brand Report</b>\n`;
  msg += `<i>${insights.period}  •  ${nowLabel()}</i>\n\n`;
  msg += `<b>PO Overview</b>\n`;
  msg += `• # Target: <code>${fmtNum(tva.totalTarget)}</code>\n`;
  msg += `• # PO: <code>${fmtNum(tva.totalActual)}</code>\n`;
  msg += `• Attainment: <code>${fmtPct(tva.attainmentPct)}</code>\n`;
  msg += `• On/above: <code>${fmtNum(tva.onOrAboveTarget)}</code>\n`;
  msg += `• Under: <code>${fmtNum(tva.underTarget)}</code>\n`;
  msg += `\n📎 Brand details attached as Excel.`;
  return msg + footer();
}

export async function generateMonthlyDepotScorecard() {
  return generateMonthlyKPIReport();
}

export async function generateYearlyBrandReport() {
  const year = new Date().getFullYear();
  const report = await brandMonthlyKpiService.getBrandYearlyReport({ year });
  const rows = report.rows || [];

  let msg = `📅 <b>Year Rollup ${year}</b>\n`;
  msg += `<i>${nowLabel()}</i>\n\n`;
  msg += `• Depot×brand rows: <code>${rows.length}</code>\n`;
  msg += `\n📎 Full year rollup attached as Excel.`;
  return msg + footer();
}

/** Map Settings report id → text-only generator (bot commands) */
export const REPORT_GENERATORS = {
  'license.daily': generateLicenseDailyReport,
  'vacancy.daily': generateVacancyDailyReport,
  'kpi.missing.daily': generateMissingKpiDailyReport,
  'kpi.weekly.brand': generateWeeklyBrandSnapshot,
  'kpi.weekly.under': generateUnderPerformersReport,
  'license.weekly': generateLicenseWeeklyReport,
  'kpi.monthly.brand': generateMonthlyBrandReport,
  'kpi.monthly.depot': generateMonthlyDepotScorecard,
  'kpi.yearly.brand': generateYearlyBrandReport,
  'kpi.daily.po': generateDailyReport,
  'kpi.weekly.rankings': generateWeeklyReport,
  'kpi.monthly.scorecard': generateMonthlyKPIReport,
};

export async function generateReportById(reportId) {
  const fn = REPORT_GENERATORS[reportId];
  if (!fn) throw new Error(`Unknown report id: ${reportId}`);
  return fn();
}

/**
 * Build caption + Excel attachment for scheduled / Test sends.
 * @returns {{ caption: string, filename: string, buffer: Buffer }}
 */
export async function buildReportPackage(reportId) {
  switch (reportId) {
    case 'license.daily':
    case 'license.weekly': {
      const title =
        reportId === 'license.weekly' ? 'License Week Digest' : 'License Alert';
      const data = await getLicenseAlertData(title);
      return {
        caption: asCaption(formatLicenseText(data)),
        filename: `${reportId.replace(/\./g, '_')}_${dateStamp()}.xlsx`,
        buffer: await generateLicenseExcel(data),
      };
    }

    case 'vacancy.daily': {
      const depots = await prisma.depot.findMany({
        where: {
          OR: [{ status: 'vacancy' }, { employeeId: null }],
        },
        select: {
          name: true,
          status: true,
          employeeId: true,
          brand: { select: { name: true } },
        },
        orderBy: { name: 'asc' },
      });
      const rows = depots.map((d) => ({
        name: d.name,
        brand: d.brand?.name || '—',
        status: d.status,
        reason: d.status === 'vacancy' ? 'status=vacancy' : 'no supervisor',
      }));
      const caption = asCaption(await generateVacancyDailyReport());
      return {
        caption,
        filename: `vacancy_daily_${dateStamp()}.xlsx`,
        buffer: await generateVacancyExcel({
          dateLabel: format(new Date(), 'dd MMM yyyy'),
          rows,
        }),
      };
    }

    case 'kpi.missing.daily': {
      const now = new Date();
      const insights = await brandMonthlyKpiService.getDashboardInsights({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        limit: 50,
      });
      const rows = (insights.attention || []).filter((a) =>
        ['missing_target', 'missing_available', 'missing_display'].includes(
          a.type,
        ),
      );
      return {
        caption: asCaption(await generateMissingKpiDailyReport()),
        filename: `kpi_missing_daily_${dateStamp()}.xlsx`,
        buffer: await generateMissingKpiExcel({
          period: insights.period || '',
          rows,
        }),
      };
    }

    case 'kpi.weekly.brand':
    case 'kpi.daily.po': {
      const data = await getDailyReportData();
      return {
        caption: asCaption(await generateDailyReport()),
        filename: `kpi_weekly_brand_${dateStamp()}.xlsx`,
        buffer: await generateDailyExcel(data),
      };
    }

    case 'kpi.weekly.under': {
      const report = await brandMonthlyKpiService.getBrandMonthlyReport({});
      const rows = (report.rows || [])
        .filter(
          (r) =>
            r.poTarget != null && r.poTarget > 0 && (r.poPercent ?? 0) < 80,
        )
        .sort((a, b) => (a.poPercent ?? 0) - (b.poPercent ?? 0));
      return {
        caption: asCaption(await generateUnderPerformersReport()),
        filename: `kpi_under_performers_${dateStamp()}.xlsx`,
        buffer: await generateUnderPerformersExcel({
          period: report.period,
          rows,
        }),
      };
    }

    case 'kpi.weekly.rankings': {
      const data = await getWeeklyReportData();
      return {
        caption: asCaption(await generateWeeklyReport()),
        filename: `weekly_rankings_${dateStamp()}.xlsx`,
        buffer: await generateWeeklyExcel(data),
      };
    }

    case 'kpi.monthly.brand': {
      const brands = await brandMonthlyKpiService.getDashboardBrand({});
      const insights = await brandMonthlyKpiService.getDashboardInsights({
        limit: 50,
      });
      const under = (insights.attention || []).filter(
        (a) => a.type === 'under_target',
      );
      return {
        caption: asCaption(await generateMonthlyBrandReport()),
        filename: `kpi_monthly_brand_${monthStamp()}.xlsx`,
        buffer: await generateMonthlyBrandExcel({
          period: insights.period,
          targetVsActual: insights.targetVsActual,
          brands,
          under,
        }),
      };
    }

    case 'kpi.monthly.depot':
    case 'kpi.monthly.scorecard': {
      const data = await getMonthlyKPIData();
      return {
        caption: asCaption(await generateMonthlyKPIReport()),
        filename: `kpi_monthly_depot_${monthStamp()}.xlsx`,
        buffer: await generateMonthlyKPIExcel(data),
      };
    }

    case 'kpi.yearly.brand': {
      const year = new Date().getFullYear();
      const report = await brandMonthlyKpiService.getBrandYearlyReport({ year });
      const rows = [...(report.rows || [])].sort(
        (a, b) => Number(b.totalPo || 0) - Number(a.totalPo || 0),
      );
      return {
        caption: asCaption(await generateYearlyBrandReport()),
        filename: `kpi_yearly_brand_${year}.xlsx`,
        buffer: await generateYearlyExcel({ year, rows }),
      };
    }

    default:
      throw new Error(`Unknown report id: ${reportId}`);
  }
}
