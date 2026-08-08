/**
 * Seed KPI catalog (Approach B) + optional default pack.
 * Safe to call multiple times (upsert by code).
 */
export const DEFAULT_KPI_DEFINITIONS = [
  {
    code: "PO_COUNT",
    name: "# PO",
    description: "Purchase orders completed in the month",
    unit: "count",
    valueType: "number",
    direction: "higher_better",
    sortOrder: 1,
  },
  {
    code: "PO_TARGET",
    name: "# Target",
    description: "Monthly PO target",
    unit: "count",
    valueType: "number",
    direction: "higher_better",
    sortOrder: 2,
  },
  {
    code: "PRODUCT_AVAILABLE_PCT",
    name: "% Product Available",
    description: "Product availability percentage",
    unit: "percent",
    valueType: "percent",
    direction: "higher_better",
    sortOrder: 3,
  },
  {
    code: "VOLUME_DISPLAY_PCT",
    name: "% Volume Display",
    description: "Volume display percentage",
    unit: "percent",
    valueType: "percent",
    direction: "higher_better",
    sortOrder: 4,
  },
];

export async function seedKpiCatalog(prisma) {
  for (const def of DEFAULT_KPI_DEFINITIONS) {
    await prisma.kpiDefinition.upsert({
      where: { code: def.code },
      update: {
        name: def.name,
        description: def.description,
        unit: def.unit,
        valueType: def.valueType,
        direction: def.direction,
        sortOrder: def.sortOrder,
        isActive: true,
      },
      create: def,
    });
  }

  const pack = await prisma.kpiPack.upsert({
    where: { code: "FIELD_FORCE_2026" },
    update: {
      name: "Field Force Scorecard 2026",
      description: "Default monthly Excel scorecard for supervisors/depots",
      isActive: true,
    },
    create: {
      code: "FIELD_FORCE_2026",
      name: "Field Force Scorecard 2026",
      description: "Default monthly Excel scorecard for supervisors/depots",
    },
  });

  const defs = await prisma.kpiDefinition.findMany({
    where: { code: { in: DEFAULT_KPI_DEFINITIONS.map((d) => d.code) } },
  });

  for (const def of defs) {
    await prisma.kpiPackItem.upsert({
      where: {
        packId_kpiDefinitionId: {
          packId: pack.id,
          kpiDefinitionId: def.id,
        },
      },
      update: {
        weight: 1,
        sortOrder: def.sortOrder,
      },
      create: {
        packId: pack.id,
        kpiDefinitionId: def.id,
        weight: 1,
        sortOrder: def.sortOrder,
      },
    });
  }

  return { pack, definitions: defs };
}

/**
 * Map legacy EmployeeKPI rows into PO_COUNT / PO_TARGET kpi_values.
 */
export async function backfillKpiValuesFromEmployeeKpi(prisma) {
  const [poCount, poTarget] = await Promise.all([
    prisma.kpiDefinition.findUnique({ where: { code: "PO_COUNT" } }),
    prisma.kpiDefinition.findUnique({ where: { code: "PO_TARGET" } }),
  ]);
  if (!poCount || !poTarget) {
    throw new Error("KPI definitions missing — run seedKpiCatalog first");
  }

  const legacy = await prisma.employeeKPI.findMany();
  let upserted = 0;

  for (const row of legacy) {
    const depot = await prisma.depot.findUnique({
      where: { id: row.depotId },
      select: { brandId: true },
    });

    await prisma.kpiValue.upsert({
      where: {
        employeeId_depotId_kpiDefinitionId_periodMonth: {
          employeeId: row.employeeId,
          depotId: row.depotId,
          kpiDefinitionId: poTarget.id,
          periodMonth: row.month,
        },
      },
      update: {
        actualValue: Number(row.targetValue || 0),
        targetValue: Number(row.targetValue || 0),
        brandId: depot?.brandId ?? null,
        remarks: row.remarks,
      },
      create: {
        employeeId: row.employeeId,
        depotId: row.depotId,
        brandId: depot?.brandId ?? null,
        kpiDefinitionId: poTarget.id,
        periodMonth: row.month,
        actualValue: Number(row.targetValue || 0),
        targetValue: Number(row.targetValue || 0),
        remarks: row.remarks,
      },
    });

    await prisma.kpiValue.upsert({
      where: {
        employeeId_depotId_kpiDefinitionId_periodMonth: {
          employeeId: row.employeeId,
          depotId: row.depotId,
          kpiDefinitionId: poCount.id,
          periodMonth: row.month,
        },
      },
      update: {
        actualValue: Number(row.actualValue || 0),
        targetValue: Number(row.targetValue || 0),
        score: row.performance,
        brandId: depot?.brandId ?? null,
        remarks: row.remarks,
      },
      create: {
        employeeId: row.employeeId,
        depotId: row.depotId,
        brandId: depot?.brandId ?? null,
        kpiDefinitionId: poCount.id,
        periodMonth: row.month,
        actualValue: Number(row.actualValue || 0),
        targetValue: Number(row.targetValue || 0),
        score: row.performance,
        remarks: row.remarks,
      },
    });

    upserted += 2;
  }

  return { legacyRows: legacy.length, valueRowsUpserted: upserted };
}
