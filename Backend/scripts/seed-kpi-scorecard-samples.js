/**
 * Seed % Product Available + % Volume Display onto existing PO kpi months.
 * Usage: node --env-file=.env.local scripts/seed-kpi-scorecard-samples.js
 */
import { prisma } from "../src/config/db.js";
import { seedKpiCatalog } from "../src/services/kpiCatalog.js";

await seedKpiCatalog(prisma);

const [avail, display, poCount] = await Promise.all([
  prisma.kpiDefinition.findUnique({ where: { code: "PRODUCT_AVAILABLE_PCT" } }),
  prisma.kpiDefinition.findUnique({ where: { code: "VOLUME_DISPLAY_PCT" } }),
  prisma.kpiDefinition.findUnique({ where: { code: "PO_COUNT" } }),
]);

if (!avail || !display || !poCount) {
  throw new Error("KPI definitions missing");
}

const poRows = await prisma.kpiValue.findMany({
  where: { kpiDefinitionId: poCount.id },
  select: {
    employeeId: true,
    depotId: true,
    brandId: true,
    periodMonth: true,
    actualValue: true,
  },
});

let upserted = 0;
for (const row of poRows) {
  const availablePct = Math.min(100, 88 + (row.depotId % 12));
  const displayPct = Math.min(100, 75 + (row.depotId % 20) + (Number(row.actualValue || 0) % 5));

  for (const [def, value] of [
    [avail, availablePct],
    [display, displayPct],
  ]) {
    await prisma.kpiValue.upsert({
      where: {
        employeeId_depotId_kpiDefinitionId_periodMonth: {
          employeeId: row.employeeId,
          depotId: row.depotId,
          kpiDefinitionId: def.id,
          periodMonth: row.periodMonth,
        },
      },
      update: { actualValue: value, brandId: row.brandId },
      create: {
        employeeId: row.employeeId,
        depotId: row.depotId,
        brandId: row.brandId,
        kpiDefinitionId: def.id,
        periodMonth: row.periodMonth,
        actualValue: value,
      },
    });
    upserted++;
  }
}

console.log(`Seeded Available/Display on ${poRows.length} PO rows (${upserted} kpi_values upserts)`);
await prisma.$disconnect();
