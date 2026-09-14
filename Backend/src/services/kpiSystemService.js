import { Prisma } from "@prisma/client";
import { prisma } from "../config/db.js";
import { parseISO } from "date-fns";
import { utcMonthStart, utcMonthEnd } from "../helpers/date.helper.js";
import { seedKpiCatalog } from "./kpiCatalog.js";

const CODE_PO_COUNT = "PO_COUNT";
const CODE_PO_TARGET = "PO_TARGET";
const CODE_AVAILABLE = "PRODUCT_AVAILABLE_PCT";
const CODE_DISPLAY = "VOLUME_DISPLAY_PCT";

function parseMonthRange(fromDate, toDate) {
  const from = fromDate ? parseISO(fromDate) : new Date();
  const to = toDate ? parseISO(toDate) : new Date();
  return {
    gte: utcMonthStart(from),
    lte: utcMonthEnd(to),
  };
}

function employeeDisplayName(employee) {
  return (
    employee?.khmerName || employee?.englishName || employee?.email || "Unknown"
  );
}

function calcKpiPercent(targetQty, actualQty) {
  return targetQty > 0 ? (actualQty / targetQty) * 100 : 0;
}

class KpiSystemService {
  #catalogReady = false;

  async ensureCatalog() {
    if (this.#catalogReady) return;
    if (!prisma.kpiDefinition) {
      throw new Error(
        "Prisma client missing KPI models — run `npx prisma generate` and restart the backend",
      );
    }
    const existing = await prisma.kpiDefinition.count({
      where: { code: { in: [CODE_PO_COUNT, CODE_PO_TARGET] } },
    });
    if (existing < 2) {
      await seedKpiCatalog(prisma);
    }
    this.#catalogReady = true;
  }

  async getDefinitionMap(codes = [CODE_PO_COUNT, CODE_PO_TARGET]) {
    await this.ensureCatalog();
    const defs = await prisma.kpiDefinition.findMany({
      where: { code: { in: codes } },
    });
    return Object.fromEntries(defs.map((d) => [d.code, d]));
  }

  buildValueWhere({ fromDate, toDate, depotId, brandId, search, definitionIds }) {
    const monthRange = parseMonthRange(fromDate, toDate);
    const where = {
      periodMonth: monthRange,
      kpiDefinitionId: { in: definitionIds },
    };

    if (depotId) where.depotId = Number(depotId);
    if (brandId) where.brandId = Number(brandId);

    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { employee: { englishName: { contains: term, mode: "insensitive" } } },
        { employee: { khmerName: { contains: term, mode: "insensitive" } } },
        { employee: { email: { contains: term, mode: "insensitive" } } },
        { depot: { name: { contains: term, mode: "insensitive" } } },
      ];
    }

    return where;
  }

  async getRankings(params = {}) {
    const { fromDate, toDate, depotId, brandId, search } = params;
    const defMap = await this.getDefinitionMap([
      CODE_PO_COUNT,
      CODE_PO_TARGET,
      CODE_AVAILABLE,
      CODE_DISPLAY,
    ]);
    const poCountDef = defMap[CODE_PO_COUNT];
    const poTargetDef = defMap[CODE_PO_TARGET];
    if (!poCountDef || !poTargetDef) return [];

    const definitionIds = [
      poCountDef.id,
      poTargetDef.id,
      defMap[CODE_AVAILABLE]?.id,
      defMap[CODE_DISPLAY]?.id,
    ].filter(Boolean);

    // Raw SQL with real JOINs instead of `include` — Prisma's relation
    // loading for this generator/adapter combo issues one sequential
    // round trip per included relation rather than a SQL join (measured:
    // 4 round trips, ~100-900ms each here, for what should be one query).
    // Aggregation logic below is unchanged from the include-based version,
    // just fed from flat joined columns instead of nested relation objects.
    const monthRange = parseMonthRange(fromDate, toDate);
    const whereConditions = [
      Prisma.sql`kv.period_month >= ${monthRange.gte}`,
      Prisma.sql`kv.period_month <= ${monthRange.lte}`,
      Prisma.sql`kv.kpi_definition_id IN (${Prisma.join(definitionIds)})`,
    ];
    if (depotId) whereConditions.push(Prisma.sql`kv.depot_id = ${Number(depotId)}`);
    if (brandId) whereConditions.push(Prisma.sql`kv.brand_id = ${Number(brandId)}`);
    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      whereConditions.push(
        Prisma.sql`(e.english_name ILIKE ${term} OR e.khmer_name ILIKE ${term} OR e.email ILIKE ${term} OR d.name ILIKE ${term})`,
      );
    }

    const values = await prisma.$queryRaw`
      SELECT
        kv.employee_id AS "employeeId",
        e.khmer_name AS "khmerName",
        e.english_name AS "englishName",
        e.email AS "email",
        d.name AS "depotName",
        kd.code AS "code",
        kv.actual_value AS "actualValue",
        kv.target_value AS "targetValue",
        kv.score AS "score"
      FROM kpi_values kv
      JOIN kpi_definitions kd ON kd.id = kv.kpi_definition_id
      JOIN employees e ON e.id = kv.employee_id
      LEFT JOIN depots d ON d.id = kv.depot_id
      WHERE ${Prisma.join(whereConditions, " AND ")}
    `;

    // Fallback to legacy EmployeeKPI if no dynamic values yet
    if (values.length === 0) {
      return this.getRankingsFromLegacy(params);
    }

    const byEmployee = new Map();
    for (const row of values) {
      const key = row.employeeId;
      if (!byEmployee.has(key)) {
        byEmployee.set(key, {
          id: String(row.employeeId),
          employeeId: row.employeeId,
          employeeName: employeeDisplayName({
            khmerName: row.khmerName,
            englishName: row.englishName,
            email: row.email,
          }),
          targetQty: 0,
          actualQty: 0,
          actualRevenue: 0,
          availableSum: 0,
          availableCount: 0,
          displaySum: 0,
          displayCount: 0,
          depots: new Set(),
        });
      }
      const agg = byEmployee.get(key);
      if (row.code === CODE_PO_TARGET) {
        agg.targetQty += Number(row.actualValue || row.targetValue || 0);
      }
      if (row.code === CODE_PO_COUNT) {
        agg.actualQty += Number(row.actualValue || 0);
        if (row.score != null) agg.actualRevenue += Number(row.score || 0);
      }
      if (row.code === CODE_AVAILABLE && row.actualValue != null) {
        agg.availableSum += Number(row.actualValue);
        agg.availableCount += 1;
      }
      if (row.code === CODE_DISPLAY && row.actualValue != null) {
        agg.displaySum += Number(row.actualValue);
        agg.displayCount += 1;
      }
      if (row.depotName) agg.depots.add(row.depotName);
    }

    return Array.from(byEmployee.values())
      .map((row) => {
        const kpiPercent = calcKpiPercent(row.targetQty, row.actualQty);
        return {
          id: row.id,
          employeeId: row.employeeId,
          employeeName: row.employeeName,
          targetQty: Math.round(row.targetQty),
          actualQty: Math.round(row.actualQty),
          poTarget: Math.round(row.targetQty),
          poCount: Math.round(row.actualQty),
          actualRevenue: Number(row.actualRevenue.toFixed(2)),
          productAvailablePct:
            row.availableCount > 0
              ? Number((row.availableSum / row.availableCount).toFixed(1))
              : null,
          volumeDisplayPct:
            row.displayCount > 0
              ? Number((row.displaySum / row.displayCount).toFixed(1))
              : null,
          kpiPercent: Number(kpiPercent.toFixed(1)),
          depotNames: Array.from(row.depots),
        };
      })
      .sort((a, b) => b.kpiPercent - a.kpiPercent || b.actualQty - a.actualQty)
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }

  /** Legacy path — used only when kpi_values is empty */
  async getRankingsFromLegacy(params = {}) {
    const { fromDate, toDate, depotId, brandId, search } = params;
    const monthRange = parseMonthRange(fromDate, toDate);
    const where = { month: monthRange };
    if (depotId) where.depotId = Number(depotId);
    // EmployeeKPI has no brandId column — filter through the depot relation instead
    if (brandId) where.depot = { brandId: Number(brandId) };
    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { employee: { englishName: { contains: term, mode: "insensitive" } } },
        { employee: { khmerName: { contains: term, mode: "insensitive" } } },
        { depot: { name: { contains: term, mode: "insensitive" } } },
      ];
    }

    const kpis = await prisma.employeeKPI.findMany({
      where,
      include: {
        employee: {
          select: { id: true, khmerName: true, englishName: true, email: true },
        },
        depot: { select: { id: true, name: true } },
      },
    });

    const byEmployee = new Map();
    for (const kpi of kpis) {
      const key = kpi.employeeId;
      if (!byEmployee.has(key)) {
        byEmployee.set(key, {
          id: String(kpi.employeeId),
          employeeId: kpi.employeeId,
          employeeName: employeeDisplayName(kpi.employee),
          targetQty: 0,
          actualQty: 0,
          actualRevenue: 0,
          depots: new Set(),
        });
      }
      const row = byEmployee.get(key);
      row.targetQty += Number(kpi.targetValue || 0);
      row.actualQty += Number(kpi.actualValue || 0);
      row.actualRevenue += Number(kpi.performance || 0);
      if (kpi.depot?.name) row.depots.add(kpi.depot.name);
    }

    return Array.from(byEmployee.values())
      .map((row) => {
        const kpiPercent = calcKpiPercent(row.targetQty, row.actualQty);
        return {
          id: row.id,
          employeeId: row.employeeId,
          employeeName: row.employeeName,
          targetQty: Math.round(row.targetQty),
          actualQty: Math.round(row.actualQty),
          poTarget: Math.round(row.targetQty),
          poCount: Math.round(row.actualQty),
          actualRevenue: Number(row.actualRevenue.toFixed(2)),
          productAvailablePct: null,
          volumeDisplayPct: null,
          kpiPercent: Number(kpiPercent.toFixed(1)),
          depotNames: Array.from(row.depots),
        };
      })
      .sort((a, b) => b.kpiPercent - a.kpiPercent || b.actualQty - a.actualQty)
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }

  /**
   * Reduces already-per-employee rows (one row per employee, not per
   * kpi_value) to the 5 dashboard summary numbers. `rows` must already be
   * sorted by kpiPercent DESC (topPerformer is rows[0]).
   */
  #reduceToSummary(rows) {
    const assessed = rows.filter((r) => r.targetQty > 0);
    const avgKpi =
      assessed.length > 0
        ? assessed.reduce((sum, row) => sum + row.kpiPercent, 0) /
          assessed.length
        : 0;

    return {
      averageKpi: Number(avgKpi.toFixed(1)),
      topPerformer: rows[0]?.employeeName || "N/A",
      employeesAssessed: rows.length,
      aboveTarget: assessed.filter((r) => r.kpiPercent >= 100).length,
      belowThreshold: assessed.filter((r) => r.kpiPercent < 80).length,
    };
  }

  /**
   * getSummary only needs 5 numbers (avg/top/count/aboveTarget/below), not
   * the full per-employee row shape getRankings builds for display (which
   * pulls every matching kpi_value row with employee/depot/kpiDefinition
   * relations into Node and reduces in JS — expensive, and each `include`
   * relation was measured firing as its own sequential round trip rather
   * than a SQL join). This aggregates directly in Postgres instead: one
   * query, GROUP BY employee, same 4-definition-code scope as getRankings
   * (so employeesAssessed still counts anyone with ANY of the 4 KPI types
   * that period, matching the original behavior exactly) with only
   * PO_TARGET/PO_COUNT summed (the two kpiPercent is derived from).
   */
  async getSummary(params = {}) {
    const { fromDate, toDate, depotId, brandId, search } = params;
    const monthRange = parseMonthRange(fromDate, toDate);

    const conditions = [
      Prisma.sql`kv.period_month >= ${monthRange.gte}`,
      Prisma.sql`kv.period_month <= ${monthRange.lte}`,
      Prisma.sql`kd.code IN (${CODE_PO_TARGET}, ${CODE_PO_COUNT}, ${CODE_AVAILABLE}, ${CODE_DISPLAY})`,
    ];
    if (depotId) conditions.push(Prisma.sql`kv.depot_id = ${Number(depotId)}`);
    if (brandId) conditions.push(Prisma.sql`kv.brand_id = ${Number(brandId)}`);
    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(
        Prisma.sql`(e.english_name ILIKE ${term} OR e.khmer_name ILIKE ${term} OR e.email ILIKE ${term} OR d.name ILIKE ${term})`,
      );
    }

    const rows = await prisma.$queryRaw`
      SELECT
        kv.employee_id AS "employeeId",
        COALESCE(e.khmer_name, e.english_name, e.email, 'Unknown') AS "employeeName",
        SUM(CASE WHEN kd.code = ${CODE_PO_TARGET} THEN COALESCE(kv.actual_value, kv.target_value, 0) ELSE 0 END)::float AS "targetQty",
        SUM(CASE WHEN kd.code = ${CODE_PO_COUNT} THEN COALESCE(kv.actual_value, 0) ELSE 0 END)::float AS "actualQty"
      FROM kpi_values kv
      JOIN kpi_definitions kd ON kd.id = kv.kpi_definition_id
      JOIN employees e ON e.id = kv.employee_id
      LEFT JOIN depots d ON d.id = kv.depot_id
      WHERE ${Prisma.join(conditions, " AND ")}
      GROUP BY kv.employee_id, e.khmer_name, e.english_name, e.email
    `;

    // Same fallback getRankings() already has: no dynamic kpi_values rows
    // for this period/filter means the legacy EmployeeKPI table is the
    // only data source.
    if (rows.length === 0) {
      const legacyRows = await this.getRankingsFromLegacy(params);
      return this.#reduceToSummary(legacyRows);
    }

    const withPercent = rows
      .map((r) => ({
        employeeName: r.employeeName,
        targetQty: r.targetQty,
        actualQty: r.actualQty,
        kpiPercent: calcKpiPercent(r.targetQty, r.actualQty),
      }))
      .sort((a, b) => b.kpiPercent - a.kpiPercent || b.actualQty - a.actualQty);

    return this.#reduceToSummary(withPercent);
  }

  async getMatrix() {
    // Product inventory matrices were removed with the products feature.
    return { productNames: [], rows: [] };
  }

  async setTarget({ employeeId, depotId, month, targetQty }) {
    const monthDate = utcMonthStart(parseISO(`${month}-01`));
    const defMap = await this.getDefinitionMap([CODE_PO_TARGET, CODE_PO_COUNT]);
    const depot = await prisma.depot.findUnique({
      where: { id: Number(depotId) },
      select: { brandId: true },
    });

    const [legacy, poTarget] = await prisma.$transaction([
      prisma.employeeKPI.upsert({
        where: {
          employeeId_depotId_month: {
            employeeId: Number(employeeId),
            depotId: Number(depotId),
            month: monthDate,
          },
        },
        update: { targetValue: Number(targetQty), remarks: null },
        create: {
          employeeId: Number(employeeId),
          depotId: Number(depotId),
          month: monthDate,
          targetValue: Number(targetQty),
          actualValue: 0,
          performance: 0,
          remarks: null,
        },
        include: {
          employee: {
            select: { id: true, khmerName: true, englishName: true },
          },
          depot: { select: { id: true, name: true } },
        },
      }),
      prisma.kpiValue.upsert({
        where: {
          employeeId_depotId_kpiDefinitionId_periodMonth: {
            employeeId: Number(employeeId),
            depotId: Number(depotId),
            kpiDefinitionId: defMap[CODE_PO_TARGET].id,
            periodMonth: monthDate,
          },
        },
        update: {
          actualValue: Number(targetQty),
          targetValue: Number(targetQty),
          brandId: depot?.brandId ?? null,
        },
        create: {
          employeeId: Number(employeeId),
          depotId: Number(depotId),
          brandId: depot?.brandId ?? null,
          kpiDefinitionId: defMap[CODE_PO_TARGET].id,
          periodMonth: monthDate,
          actualValue: Number(targetQty),
          targetValue: Number(targetQty),
        },
      }),
    ]);

    // Ensure PO_COUNT row exists for the month
    await prisma.kpiValue.upsert({
      where: {
        employeeId_depotId_kpiDefinitionId_periodMonth: {
          employeeId: Number(employeeId),
          depotId: Number(depotId),
          kpiDefinitionId: defMap[CODE_PO_COUNT].id,
          periodMonth: monthDate,
        },
      },
      update: {
        targetValue: Number(targetQty),
        brandId: depot?.brandId ?? null,
      },
      create: {
        employeeId: Number(employeeId),
        depotId: Number(depotId),
        brandId: depot?.brandId ?? null,
        kpiDefinitionId: defMap[CODE_PO_COUNT].id,
        periodMonth: monthDate,
        actualValue: 0,
        targetValue: Number(targetQty),
      },
    });

    return { ...legacy, kpiValue: poTarget };
  }

  async getFilterOptions() {
    const [depots, definitions, brands] = await Promise.all([
      prisma.depot.findMany({
        select: {
          id: true,
          name: true,
          brandId: true,
          district: {
            select: { name: true, province: { select: { name: true } } },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.kpiDefinition.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.brand.findMany({
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      depots: depots.map((d) => ({
        id: d.id,
        name: d.name,
        brandId: d.brandId ?? null,
        districtName: d.district?.name || null,
        provinceName: d.district?.province?.name || null,
      })),
      brands,
      definitions,
    };
  }

  async listDefinitions() {
    await this.ensureCatalog();
    return prisma.kpiDefinition.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  /**
   * Wide monthly scorecard (Excel-shaped) for one period.
   */
  async getWideMonth({ month, depotId, employeeId, brandId } = {}) {
    await this.ensureCatalog();
    const periodStart = month
      ? utcMonthStart(parseISO(`${month}-01`))
      : utcMonthStart(new Date());
    const periodEnd = utcMonthEnd(periodStart);

    const defs = await prisma.kpiDefinition.findMany({
      where: {
        code: {
          in: [CODE_PO_COUNT, CODE_PO_TARGET, CODE_AVAILABLE, CODE_DISPLAY],
        },
      },
    });
    const defById = Object.fromEntries(defs.map((d) => [d.id, d.code]));

    const values = await prisma.kpiValue.findMany({
      where: {
        periodMonth: { gte: periodStart, lte: periodEnd },
        kpiDefinitionId: { in: defs.map((d) => d.id) },
        ...(depotId && { depotId: Number(depotId) }),
        ...(employeeId && { employeeId: Number(employeeId) }),
        ...(brandId && { brandId: Number(brandId) }),
      },
      include: {
        employee: {
          select: {
            id: true,
            englishName: true,
            khmerName: true,
            employeeCode: true,
          },
        },
        depot: { select: { id: true, name: true, code: true } },
      },
    });

    const map = new Map();
    for (const v of values) {
      const key = `${v.employeeId}:${v.depotId}`;
      if (!map.has(key)) {
        map.set(key, {
          employeeId: v.employeeId,
          employeeName: employeeDisplayName(v.employee),
          employeeCode: v.employee?.employeeCode || null,
          depotId: v.depotId,
          depotName: v.depot?.name || null,
          depotCode: v.depot?.code || null,
          periodMonth: periodStart,
          poCount: null,
          poTarget: null,
          productAvailablePct: null,
          volumeDisplayPct: null,
          kpiPercent: 0,
        });
      }
      const row = map.get(key);
      const code = defById[v.kpiDefinitionId];
      if (code === CODE_PO_COUNT) row.poCount = Number(v.actualValue);
      if (code === CODE_PO_TARGET)
        row.poTarget = Number(v.actualValue ?? v.targetValue);
      if (code === CODE_AVAILABLE)
        row.productAvailablePct = Number(v.actualValue);
      if (code === CODE_DISPLAY) row.volumeDisplayPct = Number(v.actualValue);
    }

    return Array.from(map.values()).map((row) => ({
      ...row,
      kpiPercent: Number(
        calcKpiPercent(row.poTarget || 0, row.poCount || 0).toFixed(1),
      ),
    }));
  }

  /**
   * Import Excel-shaped rows:
   * { employeeCode|employeeId, depotCode|depotId, month, po, target, productAvailable, volumeDisplay }
   */
  async importMonthlyRows({
    fileName = "manual.json",
    rows = [],
    uploadedBy = null,
  }) {
    await this.ensureCatalog();
    const defMap = await this.getDefinitionMap([
      CODE_PO_COUNT,
      CODE_PO_TARGET,
      CODE_AVAILABLE,
      CODE_DISPLAY,
    ]);

    const batch = await prisma.importBatch.create({
      data: {
        fileName,
        status: "validating",
        totalRows: rows.length,
        uploadedBy,
      },
    });

    const errors = [];
    let successRows = 0;
    let periodMonth = null;

    const employees = await prisma.employee.findMany({
      select: { id: true, employeeCode: true },
    });
    const depots = await prisma.depot.findMany({
      select: { id: true, code: true, brandId: true },
    });
    const empByCode = new Map(
      employees
        .filter((e) => e.employeeCode)
        .map((e) => [e.employeeCode.toUpperCase(), e.id]),
    );
    const depotByCode = new Map(
      depots.filter((d) => d.code).map((d) => [d.code.toUpperCase(), d]),
    );
    const depotById = new Map(depots.map((d) => [d.id, d]));

    try {
      await prisma.importBatch.update({
        where: { id: batch.id },
        data: { status: "importing" },
      });

      for (let i = 0; i < rows.length; i++) {
        const raw = rows[i];
        const rowNum = i + 2; // header = 1
        const rowErrors = [];

        let employeeId = raw.employeeId ? Number(raw.employeeId) : null;
        if (!employeeId && raw.employeeCode) {
          employeeId =
            empByCode.get(String(raw.employeeCode).toUpperCase()) || null;
        }
        if (!employeeId) rowErrors.push("employee not found");

        let depot = null;
        if (raw.depotId) depot = depotById.get(Number(raw.depotId)) || null;
        if (!depot && raw.depotCode) {
          depot = depotByCode.get(String(raw.depotCode).toUpperCase()) || null;
        }
        if (!depot) rowErrors.push("depot not found");

        const monthRaw = raw.month || raw.periodMonth;
        let monthDate = null;
        if (monthRaw) {
          const parsed =
            typeof monthRaw === "string" && /^\d{4}-\d{2}$/.test(monthRaw)
              ? parseISO(`${monthRaw}-01`)
              : new Date(monthRaw);
          if (!Number.isNaN(parsed.getTime()))
            monthDate = utcMonthStart(parsed);
        }
        if (!monthDate) rowErrors.push("invalid month");

        const po = Number(raw.po ?? raw.poCount);
        const target = Number(raw.target ?? raw.poTarget);
        const available = Number(
          raw.productAvailable ?? raw.productAvailablePct,
        );
        const display = Number(raw.volumeDisplay ?? raw.volumeDisplayPct);

        if (Number.isNaN(po)) rowErrors.push("po is required");
        if (Number.isNaN(target)) rowErrors.push("target is required");

        if (rowErrors.length) {
          errors.push({ rowNumber: rowNum, errors: rowErrors, data: raw });
          continue;
        }

        periodMonth = monthDate;
        const brandId = depot.brandId ?? null;
        const metrics = [
          { def: defMap[CODE_PO_COUNT], actual: po, target },
          { def: defMap[CODE_PO_TARGET], actual: target, target },
        ];
        if (!Number.isNaN(available)) {
          metrics.push({
            def: defMap[CODE_AVAILABLE],
            actual: available,
            target: null,
          });
        }
        if (!Number.isNaN(display)) {
          metrics.push({
            def: defMap[CODE_DISPLAY],
            actual: display,
            target: null,
          });
        }

        for (const m of metrics) {
          if (!m.def) continue;
          await prisma.kpiValue.upsert({
            where: {
              employeeId_depotId_kpiDefinitionId_periodMonth: {
                employeeId,
                depotId: depot.id,
                kpiDefinitionId: m.def.id,
                periodMonth: monthDate,
              },
            },
            update: {
              actualValue: m.actual,
              targetValue: m.target,
              brandId,
              importBatchId: batch.id,
              score:
                m.def.code === CODE_PO_COUNT && target > 0
                  ? Number(((po / target) * 100).toFixed(1))
                  : null,
            },
            create: {
              employeeId,
              depotId: depot.id,
              brandId,
              kpiDefinitionId: m.def.id,
              periodMonth: monthDate,
              actualValue: m.actual,
              targetValue: m.target,
              importBatchId: batch.id,
              score:
                m.def.code === CODE_PO_COUNT && target > 0
                  ? Number(((po / target) * 100).toFixed(1))
                  : null,
            },
          });
        }

        // Keep legacy EmployeeKPI in sync for older screens
        await prisma.employeeKPI.upsert({
          where: {
            employeeId_depotId_month: {
              employeeId,
              depotId: depot.id,
              month: monthDate,
            },
          },
          update: {
            targetValue: target,
            actualValue: po,
            performance:
              target > 0 ? Number(((po / target) * 100).toFixed(1)) : 0,
          },
          create: {
            employeeId,
            depotId: depot.id,
            month: monthDate,
            targetValue: target,
            actualValue: po,
            performance:
              target > 0 ? Number(((po / target) * 100).toFixed(1)) : 0,
          },
        });

        successRows += 1;
      }

      const failedRows = errors.length;
      const status =
        failedRows === 0 ? "success" : successRows === 0 ? "failed" : "partial";

      const updated = await prisma.importBatch.update({
        where: { id: batch.id },
        data: {
          status,
          periodMonth,
          successRows,
          failedRows,
          errorReport: errors.length ? errors : null,
          completedAt: new Date(),
        },
      });

      return {
        batch: updated,
        importedRows: successRows,
        failedRows,
        errors,
      };
    } catch (error) {
      await prisma.importBatch.update({
        where: { id: batch.id },
        data: {
          status: "failed",
          errorReport: [{ message: error.message }],
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }
}

export const kpiSystemService = new KpiSystemService();
