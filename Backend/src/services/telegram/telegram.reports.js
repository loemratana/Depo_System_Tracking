// src/services/telegram/telegram.reports.js
import { prisma } from '../../config/db.js';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';

// ──────────────────────────────────────────────────────────────
// 1. DAILY SALES REPORT – data fetch
// ──────────────────────────────────────────────────────────────
export async function getDailyReportData() {
  const today = new Date();
  const start = startOfDay(today);
  const end = endOfDay(today);

  const performances = await prisma.productPerformance.groupBy({
    by: ['productId', 'employeeId'],
    where: { month: { gte: start, lte: end } },
    _sum: { quantitySold: true, revenue: true },
  });

  if (performances.length === 0) {
    return { rows: [], totalQuantity: 0, totalRevenue: 0 };
  }

  const productIds = performances.map(p => p.productId);
  const employeeIds = performances.map(p => p.employeeId);
  const [products, employees] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, sku: true } }),
    prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      include: { depots: { select: { name: true } } },
    }),
  ]);
  const productMap = new Map(products.map(p => [p.id, p]));
  const employeeMap = new Map(employees.map(e => [e.id, e]));

  const rows = performances.map(p => {
    const product = productMap.get(p.productId);
    const employee = employeeMap.get(p.employeeId);
    return {
      productName: product?.name || 'Unknown',
      productSku: product?.sku || 'N/A',
      employeeName: employee?.englishName || employee?.khmerName || 'Unknown',
      depotName: employee?.depots?.[0]?.name || 'Unassigned',
      quantitySold: p._sum.quantitySold || 0,
      revenue: p._sum.revenue || 0,
    };
  });

  const totalQuantity = rows.reduce((sum, r) => sum + r.quantitySold, 0);
  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);
  return { rows, totalQuantity, totalRevenue };
}

// ──────────────────────────────────────────────────────────────
// 2. WEEKLY SALES REPORT – data fetch
// ──────────────────────────────────────────────────────────────
export async function getWeeklyReportData() {
  const today = new Date();
  const start = startOfDay(subDays(today, 6));
  const end = endOfDay(today);

  const performances = await prisma.productPerformance.groupBy({
    by: ['productId', 'employeeId'],
    where: { month: { gte: start, lte: end } },
    _sum: { quantitySold: true, revenue: true },
  });

  if (performances.length === 0) {
    return { rows: [], totalQuantity: 0, totalRevenue: 0 };
  }

  const productIds = performances.map(p => p.productId);
  const employeeIds = performances.map(p => p.employeeId);
  const [products, employees] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, sku: true } }),
    prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      include: { depots: { select: { name: true } } },
    }),
  ]);
  const productMap = new Map(products.map(p => [p.id, p]));
  const employeeMap = new Map(employees.map(e => [e.id, e]));

  const rows = performances.map(p => ({
    productName: productMap.get(p.productId)?.name || 'Unknown',
    productSku: productMap.get(p.productId)?.sku || 'N/A',
    employeeName: employeeMap.get(p.employeeId)?.englishName || 'Unknown',
    depotName: employeeMap.get(p.employeeId)?.depots?.[0]?.name || 'Unassigned',
    quantitySold: p._sum.quantitySold || 0,
    revenue: p._sum.revenue || 0,
  }));

  const totalQuantity = rows.reduce((sum, r) => sum + r.quantitySold, 0);
  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);
  return { rows, totalQuantity, totalRevenue };
}

// ──────────────────────────────────────────────────────────────
// 3. MONTHLY KPI REPORT – data fetch
// ──────────────────────────────────────────────────────────────
export async function getMonthlyKPIData() {
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);

  const kpis = await prisma.employeeKPI.findMany({
    where: { month: { gte: start, lte: end } },
    include: {
      employee: { select: { englishName: true, khmerName: true } },
      depot: { select: { name: true } },
    },
  });

  const rows = kpis.map(kpi => {
    const achievement = kpi.targetValue > 0 ? (kpi.actualValue / kpi.targetValue) * 100 : 0;
    let status = 'Not Set';
    if (kpi.targetValue > 0) {
      if (achievement >= 100) status = 'Achieved';
      else if (achievement >= 80) status = 'Partial';
      else status = 'Below';
    }
    return {
      employee: kpi.employee?.englishName || kpi.employee?.khmerName || 'Unknown',
      depot: kpi.depot?.name || 'Unassigned',
      target: kpi.targetValue,
      actual: kpi.actualValue,
      achievement: parseFloat(achievement.toFixed(1)),
      status,
    };
  });

  const totalEmployees = kpis.length;
  const avgAchievement = totalEmployees > 0 ? rows.reduce((sum, r) => sum + r.achievement, 0) / totalEmployees : 0;
  const aboveTarget = rows.filter(r => r.achievement >= 100).length;
  const belowThreshold = rows.filter(r => r.achievement < 80 && r.target > 0).length;

  return {
    rows,
    summary: {
      totalEmployees,
      avgAchievement: parseFloat(avgAchievement.toFixed(1)),
      aboveTarget,
      belowThreshold,
    },
  };
}

// ──────────────────────────────────────────────────────────────
// 4. LOW STOCK PRODUCTS (raw SQL)
// ──────────────────────────────────────────────────────────────
export async function getLowStockData() {
  const lowStockItems = await prisma.$queryRaw`
    SELECT p.id, p.name, p.sku, p.quantity, p.min_stock, d.name as depot_name
    FROM products p
    LEFT JOIN depots d ON d.id = p.depot_id
    WHERE p.quantity < p.min_stock
    ORDER BY p.quantity ASC
  `;
  return lowStockItems.map((p) => ({
    product: p.name,
    sku: p.sku,
    depot: p.depot_name || 'Unknown',
    currentStock: Number(p.quantity),
    minStock: Number(p.min_stock),
    deficit: Math.max(0, Number(p.min_stock) - Number(p.quantity)),
  }));
}

// ──────────────────────────────────────────────────────────────
// 5. EMPLOYEE PERFORMANCE DETAIL
// ──────────────────────────────────────────────────────────────
export async function getEmployeePerformance(employeeId) {
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);

  const kpis = await prisma.employeeKPI.findMany({
    where: { employeeId, month: { gte: start, lte: end } },
    include: {
      depot: { select: { name: true } },
      employee: { select: { englishName: true, khmerName: true } },
    },
  });

  if (kpis.length === 0) {
    return `No KPI records found for employee #${employeeId} this month.`;
  }

  const totalTarget = kpis.reduce((sum, k) => sum + k.targetValue, 0);
  const totalActual = kpis.reduce((sum, k) => sum + k.actualValue, 0);
  const achievement = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;

  let msg = `📊 <b>KPI Report – ${format(now, 'MMMM yyyy')}</b>\n`;
  msg += `Employee: ${kpis[0].employee?.englishName || kpis[0].employee?.khmerName || 'Unknown'}\n`;
  msg += `Depot(s): ${kpis.map(k => k.depot?.name).join(', ') || 'Unassigned'}\n\n`;
  msg += `Total Target: ${totalTarget}\n`;
  msg += `Total Actual: ${totalActual}\n`;
  msg += `Achievement: ${achievement.toFixed(1)}%\n\n`;

  if (kpis.length > 1) {
    msg += `<b>Breakdown</b>\n`;
    kpis.forEach(k => {
      const perc = k.targetValue > 0 ? (k.actualValue / k.targetValue) * 100 : 0;
      msg += `• ${k.depot?.name || 'Unassigned'} – ${perc.toFixed(1)}% (${k.actualValue}/${k.targetValue})\n`;
    });
  }
  return msg;
}

// ──────────────────────────────────────────────────────────────
// 6. HELPER: progress bar (visual)
// ──────────────────────────────────────────────────────────────
function progressBar(value, total, width = 10) {
  if (total === 0) return '─'.repeat(width);
  const filled = Math.round((value / total) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// ──────────────────────────────────────────────────────────────
// 7. PROFESSIONAL TEXT REPORTS (with modern formatting)
// ──────────────────────────────────────────────────────────────

export async function generateDailyReport() {
  const data = await getDailyReportData();
  const dateStr = format(new Date(), 'dd MMM yyyy');
  const now = new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  let msg = `📊 <b>Daily Sales Report</b>\n`;
  msg += `<i>${dateStr}  •  Generated ${now}</i>\n\n`;

  msg += `<b>📈 Summary</b>\n`;
  msg += `• Total Units Sold: <code>${data.totalQuantity}</code>\n`;
  msg += `• Total Revenue: <code>$${data.totalRevenue.toFixed(2)}</code>\n\n`;

  if (data.rows.length === 0) {
    msg += `☕ No sales recorded today.\n`;
  } else {
    const sorted = data.rows.sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 5);
    msg += `<b>🏆 Top Products</b>\n`;
    sorted.forEach((r, i) => {
      msg += `${i+1}. <b>${r.productName}</b>  ${r.quantitySold} units  ($${r.revenue.toFixed(2)})\n`;
    });
    const topEmp = data.rows.sort((a, b) => b.quantitySold - a.quantitySold)[0];
    if (topEmp) {
      msg += `\n👤 <b>Top Seller</b>: ${topEmp.employeeName}  (${topEmp.quantitySold} units)`;
    }
  }

  msg += `\n\n━━━━━━━━━━━━━━━━\n`;
  msg += `🤖 Generated by Depot Bot  •  <i>Data fresh</i>`;
  return msg;
}

export async function generateWeeklyReport() {
  const data = await getWeeklyReportData();
  const start = format(subDays(new Date(), 6), 'dd MMM');
  const end = format(new Date(), 'dd MMM yyyy');
  const now = new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  let msg = `📈 <b>Weekly Sales Report</b>\n`;
  msg += `<i>${start} – ${end}  •  Generated ${now}</i>\n\n`;

  msg += `<b>📊 Summary</b>\n`;
  msg += `• Total Units Sold: <code>${data.totalQuantity}</code>\n`;
  msg += `• Total Revenue: <code>$${data.totalRevenue.toFixed(2)}</code>\n`;
  const avg = Math.round(data.totalQuantity / 7);
  msg += `• Average Daily: <code>${avg}</code> units\n\n`;

  if (data.rows.length > 0) {
    const top = data.rows.sort((a, b) => b.quantitySold - a.quantitySold)[0];
    msg += `<b>🏆 Top Product</b>\n`;
    msg += `• ${top.productName}  –  ${top.quantitySold} units  ($${top.revenue.toFixed(2)})\n`;
    const topEmp = data.rows.sort((a, b) => b.quantitySold - a.quantitySold)[0];
    if (topEmp) {
      msg += `\n👤 <b>Top Seller</b>: ${topEmp.employeeName}  (${topEmp.quantitySold} units)`;
    }
  } else {
    msg += `☕ No sales recorded this week.\n`;
  }

  msg += `\n\n━━━━━━━━━━━━━━━━\n`;
  msg += `🤖 Generated by Depot Bot  •  <i>Data fresh</i>`;
  return msg;
}

export async function generateMonthlyKPIReport() {
  const data = await getMonthlyKPIData();
  const month = format(new Date(), 'MMMM yyyy');
  const now = new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  let msg = `📋 <b>Monthly KPI Summary</b>\n`;
  msg += `<i>${month}  •  Generated ${now}</i>\n\n`;

  msg += `<b>📊 Overview</b>\n`;
  msg += `• Total Employees: <code>${data.summary.totalEmployees}</code>\n`;
  msg += `• Average Achievement: <code>${data.summary.avgAchievement}%</code>\n`;
  msg += `• Above Target (>100%): <code>${data.summary.aboveTarget}</code>\n`;
  msg += `• Below 80%: <code>${data.summary.belowThreshold}</code>\n\n`;

  const sorted = data.rows.sort((a, b) => b.achievement - a.achievement).slice(0, 5);
  if (sorted.length > 0) {
    msg += `<b>🏆 Top Performers</b>\n`;
    sorted.forEach((r, i) => {
      const bar = progressBar(r.achievement, 100, 8);
      msg += `${i+1}. <b>${r.employee}</b>  ${bar}  ${r.achievement}%\n`;
      msg += `   Target: ${r.target}  Actual: ${r.actual}  (${r.status})\n`;
    });
  } else {
    msg += `📭 No KPI data yet.\n`;
  }

  msg += `\n\n━━━━━━━━━━━━━━━━\n`;
  msg += `🤖 Generated by Depot Bot  •  <i>Data fresh</i>`;
  return msg;
}

export async function getLowStockAlertMessage() {
  const data = await getLowStockData();
  const now = new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (data.length === 0) {
    return `✅ <b>Stock Levels Healthy</b>\n\nAll products are above their minimum stock levels.\n\n━━━━━━━━━━━━━━━━\n🤖 Generated by Depot Bot  •  ${now}`;
  }

  let msg = `🚨 <b>Low Stock Alert</b>\n`;
  msg += `<i>${now}</i>\n\n`;

  data.forEach((p, i) => {
    const deficit = p.deficit;
    const urgency = deficit > 50 ? '🔴' : deficit > 20 ? '🟡' : '🟠';
    msg += `${urgency} <b>${p.product}</b>  (${p.sku})\n`;
    msg += `   Depot: ${p.depot}\n`;
    msg += `   Current: <code>${p.currentStock}</code>  Min: <code>${p.minStock}</code>  Deficit: <code>${deficit}</code>\n`;
    if (i < data.length - 1) msg += `\n`;
  });

  msg += `\n━━━━━━━━━━━━━━━━\n`;
  msg += `🤖 Generated by Depot Bot  •  <i>Please restock soon</i>`;
  return msg;
}