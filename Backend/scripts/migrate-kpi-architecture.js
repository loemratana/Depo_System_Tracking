/**
 * One-shot: seed KPI catalog + backfill from employee_kpis.
 * Usage: node --env-file=.env.local scripts/migrate-kpi-architecture.js
 */
import { prisma } from "../src/config/db.js";
import {
  seedKpiCatalog,
  backfillKpiValuesFromEmployeeKpi,
} from "../src/services/kpiCatalog.js";

const catalog = await seedKpiCatalog(prisma);
console.log(`Definitions: ${catalog.definitions.length}, pack: ${catalog.pack.code}`);

const backfill = await backfillKpiValuesFromEmployeeKpi(prisma);
console.log(
  `Backfilled ${backfill.valueRowsUpserted} kpi_values from ${backfill.legacyRows} employee_kpis`,
);

await prisma.$disconnect();
