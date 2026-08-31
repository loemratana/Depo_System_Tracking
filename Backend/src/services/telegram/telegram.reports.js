// src/services/telegram/telegram.reports.js
import { format } from 'date-fns';
import { brandMonthlyKpiService } from '../brandMonthlyKpiService.js';
import { kpiSystemService } from '../kpiSystemService.js';
import { utcMonthEnd, utcMonthStart } from '../../helpers/date.helper.js';
import { escapeHtml } from './telegram.formatters.js';

function currentMonthParams() {
  const now = new Date();
  const from = utcMonthStart(now);
  const to = utcMonthEnd(now);
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    fromDate: format(from, 'yyyy-MM-dd'),
    toDate: format(to, 'yyyy-MM-dd'),
    monthKey: format(from, 'yyyy-MM'),
    periodLabel: format(now, 'MMMM yyyy'),
  };
}

function fmtPct(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(1)}%`;
}

function fmtNum(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString();
}

function progressBar(value, total = 100, width = 8) {
  if (!total || total <= 0) return '─'.repeat(width);
  const filled = Math.max(0, Math.min(width, Math.round((value / total) * width)));
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function poStatus(poPercent) {
  if (poPercent == null) return 'Not Set';
  if (poPercent >= 100) return 'Excellent';
  if (poPercent >= 90) return 'Good';
  return 'Needs Improvement';
}

// ──────────────────────────────────────────────────────────────
// DATA FETCH
// ──────────────────────────────────────────────────────────────

/** Daily = month-to-date PO / attention snapshot */
export async function getDailyReportData() {
  const { year, month, periodLabel } = currentMonthParams();
  const insights = await brandMonthlyKpiService.getDashboardInsights({
    year,
    month,
    limit: 25,
  });
  return { periodLabel, ...insights };
}

/** Weekly = employee PO % rankings for current month */
export async function getWeeklyReportData() {
  const { fromDate, toDate, periodLabel } = currentMonthParams();
  const [summary, rankings] = await Promise.all([
    kpiSystemService.getSummary({ fromDate, toDate }),
    kpiSystemService.getRankings({ fromDate, toDate }),
  ]);
  return {
    periodLabel,
    summary,
    rankings,
    top: rankings.slice(0, 5),
    bottom: [...rankings].reverse().slice(0, 5),
  };
}

/** Monthly = depot × brand KPI scorecard */
export async function getMonthlyKPIData() {
  const { year, month, periodLabel } = currentMonthParams();
  const report = await brandMonthlyKpiService.getBrandMonthlyReport({
    year,
    month,
  });

  const rows = (report.rows || []).map((row) => ({
    ...row,
    status: poStatus(row.poPercent),
  }));

  const withTarget = rows.filter((r) => r.poTarget != null && r.poTarget > 0);
  const totalTarget = withTarget.reduce((sum, r) => sum + Number(r.poTarget || 0), 0);
  const totalPo = rows.reduce((sum, r) => sum + Number(r.poActual || 0), 0);
  const avgPoPercent =
    totalTarget > 0 ? Number(((totalPo / totalTarget) * 100).toFixed(1)) : null;

  const sorted = [...withTarget].sort(
    (a, b) => (b.poPercent ?? -1) - (a.poPercent ?? -1),
  );

  return {
    periodLabel,
    period: report.period,
    rows,
    totals: {
      ...report.totals,
      totalTarget: Number(totalTarget.toFixed(1)),
      totalPo: Number(totalPo.toFixed(1)),
      avgPoPercent,
      aboveTarget: withTarget.filter((r) => (r.poPercent ?? 0) >= 100).length,
      underTarget: withTarget.filter((r) => (r.poPercent ?? 0) < 100).length,
      rowCount: rows.length,
    },
    top: sorted.slice(0, 5),
    under: [...sorted].reverse().filter((r) => (r.poPercent ?? 0) < 100).slice(0, 5),
  };
}

export async function getEmployeePerformance(employeeId) {
  const { fromDate, toDate, periodLabel, monthKey } = currentMonthParams();
  const id = Number(employeeId);

  const [rankings, wide] = await Promise.all([
    kpiSystemService.getRankings({ fromDate, toDate }),
    kpiSystemService.getWideMonth({
      month: monthKey,
      employeeId: id,
    }),
  ]);

  const rank = rankings.find((r) => r.employeeId === id);
  if (!rank && (!wide || wide.length === 0)) {
    return `No KPI records found for employee #${id} this month (${periodLabel}).`;
  }

  let msg = `📊 <b>Employee KPI – ${periodLabel}</b>\n`;
  msg += `Employee: <b>${escapeHtml(rank?.employeeName || wide[0]?.employeeName || `#${id}`)}</b>\n`;
  if (rank) {
    msg += `Rank: <code>#${rank.rank}</code>\n`;
    msg += `Depots: ${escapeHtml(rank.depotNames?.join(', ') || '—')}\n\n`;
    msg += `<b>Summary</b>\n`;
    msg += `• # Target: <code>${fmtNum(rank.poTarget)}</code>\n`;
    msg += `• # PO: <code>${fmtNum(rank.poCount)}</code>\n`;
    msg += `• PO %: <code>${fmtPct(rank.kpiPercent)}</code> (${poStatus(rank.kpiPercent)})\n`;
    msg += `• % Available: <code>${fmtPct(rank.productAvailablePct)}</code>\n`;
    msg += `• % Volume Display: <code>${fmtPct(rank.volumeDisplayPct)}</code>\n`;
  }

  if (wide?.length) {
    msg += `\n<b>Depot breakdown</b>\n`;
    for (const row of wide) {
      msg += `• ${escapeHtml(row.depotName || 'Unassigned')} – PO ${fmtNum(row.poCount)}/${fmtNum(row.poTarget)} (${fmtPct(row.kpiPercent)})`;
      msg += ` · Avail ${fmtPct(row.productAvailablePct)} · Disp ${fmtPct(row.volumeDisplayPct)}\n`;
    }
  }

  return msg;
}

// ──────────────────────────────────────────────────────────────
// TEXT REPORTS
// ──────────────────────────────────────────────────────────────

export async function generateDailyReport() {
  const data = await getDailyReportData();
  const now = new Date().toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const tva = data.targetVsActual || {};

  let msg = `📊 <b>Daily PO Snapshot</b>\n`;
  msg += `<i>${data.periodLabel} (MTD)  •  ${now}</i>\n\n`;

  msg += `<b>📈 PO Summary</b>\n`;
  msg += `• # Target: <code>${fmtNum(tva.totalTarget)}</code>\n`;
  msg += `• # PO: <code>${fmtNum(tva.totalActual)}</code>\n`;
  msg += `• PO %: <code>${fmtPct(tva.attainmentPct)}</code>\n`;
  msg += `• Depots with target: <code>${fmtNum(tva.depotsWithTarget)}</code>\n`;
  msg += `• On/above target: <code>${fmtNum(tva.onOrAboveTarget)}</code>\n`;
  msg += `• Under target: <code>${fmtNum(tva.underTarget)}</code>\n`;

  const attention = data.attention || [];
  if (attention.length > 0) {
    msg += `\n<b>⚠️ Attention</b> (${data.attentionTotal || attention.length})\n`;
    attention.slice(0, 10).forEach((item, i) => {
      const label = escapeHtml(item.depotName || 'Depot');
      const brand = item.brandName ? ` / ${escapeHtml(item.brandName)}` : '';
      msg += `${i + 1}. <b>${label}${brand}</b>\n`;
      msg += `   ${escapeHtml(item.detail || item.type)}\n`;
    });
  } else {
    msg += `\n✅ No attention items for this month.\n`;
  }

  msg += `\n━━━━━━━━━━━━━━━━\n`;
  msg += `🤖 Depot Bot  •  PO / KPI system`;
  return msg;
}

export async function generateWeeklyReport() {
  const data = await getWeeklyReportData();
  const now = new Date().toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const s = data.summary || {};

  let msg = `📈 <b>Weekly Employee Rankings</b>\n`;
  msg += `<i>${data.periodLabel} (MTD)  •  ${now}</i>\n\n`;

  msg += `<b>📊 Overview</b>\n`;
  msg += `• Avg PO %: <code>${fmtPct(s.averageKpi)}</code>\n`;
  msg += `• Employees assessed: <code>${fmtNum(s.employeesAssessed)}</code>\n`;
  msg += `• Above target (≥100%): <code>${fmtNum(s.aboveTarget)}</code>\n`;
  msg += `• Below 80%: <code>${fmtNum(s.belowThreshold)}</code>\n`;
  msg += `• Top performer: <b>${escapeHtml(s.topPerformer || 'N/A')}</b>\n`;

  if (data.top?.length) {
    msg += `\n<b>🏆 Top 5 (PO %)</b>\n`;
    data.top.forEach((r) => {
      const bar = progressBar(r.kpiPercent, 100);
      msg += `${r.rank}. <b>${escapeHtml(r.employeeName)}</b>  ${bar}  ${fmtPct(r.kpiPercent)}\n`;
      msg += `   # PO ${fmtNum(r.poCount)} / # Target ${fmtNum(r.poTarget)}\n`;
    });
  }

  if (data.bottom?.length && data.rankings.length > 5) {
    msg += `\n<b>⬇️ Bottom 5 (PO %)</b>\n`;
    data.bottom.forEach((r) => {
      msg += `• <b>${escapeHtml(r.employeeName)}</b>  ${fmtPct(r.kpiPercent)}  (# PO ${fmtNum(r.poCount)}/${fmtNum(r.poTarget)})\n`;
    });
  }

  if (!data.rankings?.length) {
    msg += `\n📭 No employee KPI rankings for this month yet.\n`;
  }

  msg += `\n━━━━━━━━━━━━━━━━\n`;
  msg += `🤖 Depot Bot  •  PO / KPI system`;
  return msg;
}

export async function generateMonthlyKPIReport() {
  const data = await getMonthlyKPIData();
  const now = new Date().toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const t = data.totals || {};

  let msg = `📋 <b>Monthly Depot KPI</b>\n`;
  msg += `<i>${data.periodLabel}  •  ${now}</i>\n\n`;

  msg += `<b>📊 Overview</b>\n`;
  msg += `• Depot/brand rows: <code>${fmtNum(t.rowCount)}</code>\n`;
  msg += `• # Target: <code>${fmtNum(t.totalTarget)}</code>\n`;
  msg += `• # PO: <code>${fmtNum(t.totalPo)}</code>\n`;
  msg += `• PO %: <code>${fmtPct(t.avgPoPercent)}</code>\n`;
  msg += `• Avg % Available: <code>${fmtPct(t.avgAvailable)}</code>\n`;
  msg += `• Avg % Volume Display: <code>${fmtPct(t.avgDisplay)}</code>\n`;
  msg += `• On/above target: <code>${fmtNum(t.aboveTarget)}</code>\n`;
  msg += `• Under target: <code>${fmtNum(t.underTarget)}</code>\n`;

  if (data.top?.length) {
    msg += `\n<b>🏆 Top depots (PO %)</b>\n`;
    data.top.forEach((r, i) => {
      const bar = progressBar(r.poPercent ?? 0, 100);
      msg += `${i + 1}. <b>${escapeHtml(r.depotName)}</b> (${escapeHtml(r.brandName || '—')})\n`;
      msg += `   ${bar} ${fmtPct(r.poPercent)}  ·  PO ${fmtNum(r.poActual)}/${fmtNum(r.poTarget)}\n`;
      msg += `   Avail ${fmtPct(r.productAvailablePct)}  ·  Disp ${fmtPct(r.volumeDisplayPct)}\n`;
    });
  }

  if (data.under?.length) {
    msg += `\n<b>⚠️ Under target</b>\n`;
    data.under.forEach((r) => {
      msg += `• <b>${escapeHtml(r.depotName)}</b> (${escapeHtml(r.brandName || '—')})  ${fmtPct(r.poPercent)}  ·  PO ${fmtNum(r.poActual)}/${fmtNum(r.poTarget)}\n`;
    });
  }

  if (!data.rows?.length) {
    msg += `\n📭 No brand/depot KPI rows for this month yet.\n`;
  }

  msg += `\n━━━━━━━━━━━━━━━━\n`;
  msg += `🤖 Depot Bot  •  PO / KPI system`;
  return msg;
}
