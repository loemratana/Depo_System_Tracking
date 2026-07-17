/**
 * One-time repair for monthly KPI / performance rows.
 *
 * Rows written before the UTC month fix used local-midnight dates (UTC+7),
 * which Postgres DATE columns truncate to the *last day of the previous
 * month*. This script moves those rows to the 1st of the intended month and
 * merges them into an existing row when one is already there.
 *
 * Usage (from the Backend folder):
 *   node scripts/normalize-kpi-months.js --dry-run   # preview only
 *   node scripts/normalize-kpi-months.js             # apply changes
 */
import { prisma } from "../src/config/db.js";

const DRY_RUN = process.argv.includes("--dry-run");

function intendedMonth(month) {
  const d = new Date(month);
  if (d.getUTCDate() === 1) return null; // already correct
  // Stored as e.g. 2026-06-30 when the intended month was July → round up.
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

const fmt = (d) => d.toISOString().slice(0, 10);

async function fixEmployeeKpis() {
  const rows = await prisma.employeeKPI.findMany();
  let moved = 0;
  let merged = 0;

  for (const row of rows) {
    const month = intendedMonth(row.month);
    if (!month) continue;

    const existing = await prisma.employeeKPI.findUnique({
      where: {
        employeeId_depotId_month: {
          employeeId: row.employeeId,
          depotId: row.depotId,
          month,
        },
      },
    });

    if (existing) {
      console.log(
        `employee_kpis #${row.id}: merge into #${existing.id} (${fmt(row.month)} -> ${fmt(month)})`,
      );
      if (!DRY_RUN) {
        await prisma.$transaction([
          prisma.employeeKPI.update({
            where: { id: existing.id },
            data: {
              actualValue: existing.actualValue + row.actualValue,
              performance: (existing.performance ?? 0) + (row.performance ?? 0),
              // Same intended target may exist on both rows; keep the larger.
              targetValue: Math.max(existing.targetValue, row.targetValue),
            },
          }),
          prisma.employeeKPI.delete({ where: { id: row.id } }),
        ]);
      }
      merged++;
    } else {
      console.log(`employee_kpis #${row.id}: ${fmt(row.month)} -> ${fmt(month)}`);
      if (!DRY_RUN) {
        await prisma.employeeKPI.update({ where: { id: row.id }, data: { month } });
      }
      moved++;
    }
  }

  console.log(`employee_kpis: ${moved} moved, ${merged} merged`);
}

async function fixProductPerformances() {
  const rows = await prisma.productPerformance.findMany();
  let moved = 0;
  let merged = 0;

  for (const row of rows) {
    const month = intendedMonth(row.month);
    if (!month) continue;

    const existing = await prisma.productPerformance.findFirst({
      where: { productId: row.productId, employeeId: row.employeeId, month },
    });

    if (existing) {
      console.log(
        `product_performances #${row.id}: merge into #${existing.id} (${fmt(row.month)} -> ${fmt(month)})`,
      );
      if (!DRY_RUN) {
        await prisma.$transaction([
          prisma.productPerformance.update({
            where: { id: existing.id },
            data: {
              quantitySold: { increment: row.quantitySold },
              revenue: { increment: Number(row.revenue || 0) },
            },
          }),
          prisma.productPerformance.delete({ where: { id: row.id } }),
        ]);
      }
      merged++;
    } else {
      console.log(`product_performances #${row.id}: ${fmt(row.month)} -> ${fmt(month)}`);
      if (!DRY_RUN) {
        await prisma.productPerformance.update({ where: { id: row.id }, data: { month } });
      }
      moved++;
    }
  }

  console.log(`product_performances: ${moved} moved, ${merged} merged`);
}

console.log(DRY_RUN ? "DRY RUN — no changes will be written\n" : "Applying changes\n");
await fixEmployeeKpis();
await fixProductPerformances();
await prisma.$disconnect();
