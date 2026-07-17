import { prisma } from "../config/db.js";
import { parseISO } from "date-fns";
import { utcMonthStart, utcMonthEnd } from "../helpers/date.helper.js";

function parseMonthRange(fromDate, toDate) {
  const from = fromDate ? parseISO(fromDate) : new Date();
  const to = toDate ? parseISO(toDate) : new Date();
  return {
    gte: utcMonthStart(from),
    lte: utcMonthEnd(to),
  };
}

function employeeDisplayName(employee) {
  return employee?.khmerName || employee?.englishName || employee?.email || "Unknown";
}

function calcKpiPercent(targetQty, actualQty) {
  // No target set means the KPI cannot be assessed; report 0 instead of a
  // fake 100% so averages and rankings are not inflated.
  return targetQty > 0 ? (actualQty / targetQty) * 100 : 0;
}

class KpiSystemService {
  buildKpiWhere({ fromDate, toDate, depotId, productId, search }) {
    const monthRange = parseMonthRange(fromDate, toDate);
    const where = {
      month: monthRange,
    };

    if (depotId) {
      where.depotId = Number(depotId);
    }

    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { employee: { englishName: { contains: term, mode: "insensitive" } } },
        { employee: { khmerName: { contains: term, mode: "insensitive" } } },
        { employee: { email: { contains: term, mode: "insensitive" } } },
        { depot: { name: { contains: term, mode: "insensitive" } } },
      ];
    }

    if (productId) {
      where.employee = {
        ...(where.employee || {}),
        productPerformances: {
          some: {
            productId: Number(productId),
            month: monthRange,
          },
        },
      };
    }

    return where;
  }

  async getRankings(params = {}) {
    const { fromDate, toDate, depotId, productId, search } = params;
    const where = this.buildKpiWhere({ fromDate, toDate, depotId, productId, search });

    const kpis = await prisma.employeeKPI.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            khmerName: true,
            englishName: true,
            email: true,
          },
        },
        depot: { select: { id: true, name: true } },
      },
      orderBy: [{ actualValue: "desc" }],
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

    const rows = Array.from(byEmployee.values())
      .map((row) => {
        const kpiPercent = calcKpiPercent(row.targetQty, row.actualQty);
        return {
          id: row.id,
          employeeId: row.employeeId,
          employeeName: row.employeeName,
          targetQty: Math.round(row.targetQty),
          actualQty: Math.round(row.actualQty),
          actualRevenue: Number(row.actualRevenue.toFixed(2)),
          kpiPercent: Number(kpiPercent.toFixed(1)),
          depotNames: Array.from(row.depots),
        };
      })
      .sort((a, b) => b.kpiPercent - a.kpiPercent || b.actualQty - a.actualQty)
      .map((row, index) => ({ ...row, rank: index + 1 }));

    return rows;
  }

  async getSummary(params = {}) {
    const rows = await this.getRankings(params);
    // Only employees with a target can be assessed; including no-target rows
    // (always 0%) would drag the average down artificially.
    const assessed = rows.filter((r) => r.targetQty > 0);
    const avgKpi =
      assessed.length > 0
        ? assessed.reduce((sum, row) => sum + row.kpiPercent, 0) / assessed.length
        : 0;

    return {
      averageKpi: Number(avgKpi.toFixed(1)),
      topPerformer: rows[0]?.employeeName || "N/A",
      employeesAssessed: rows.length,
      aboveTarget: assessed.filter((r) => r.kpiPercent >= 100).length,
      belowThreshold: assessed.filter((r) => r.kpiPercent < 80).length,
    };
  }

  async getMatrix(params = {}) {
    const { fromDate, toDate, depotId, productId, search } = params;
    const monthRange = parseMonthRange(fromDate, toDate);

    const performanceWhere = {
      month: monthRange,
      ...(productId && { productId: Number(productId) }),
      ...(depotId && { product: { depotId: Number(depotId) } }),
      ...(search?.trim() && {
        OR: [
          { employee: { englishName: { contains: search.trim(), mode: "insensitive" } } },
          { employee: { khmerName: { contains: search.trim(), mode: "insensitive" } } },
          { product: { name: { contains: search.trim(), mode: "insensitive" } } },
          { product: { depot: { name: { contains: search.trim(), mode: "insensitive" } } } },
        ],
      }),
    };

    const [performances, depotTargets] = await Promise.all([
      prisma.productPerformance.findMany({
        where: performanceWhere,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              minStock: true,
              depotId: true,
              depot: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.employeeKPI.findMany({
        where: this.buildKpiWhere({ fromDate, toDate, depotId, productId }),
        select: { depotId: true, targetValue: true },
      }),
    ]);

    const targetByDepot = new Map();
    for (const kpi of depotTargets) {
      targetByDepot.set(
        kpi.depotId,
        (targetByDepot.get(kpi.depotId) || 0) + Number(kpi.targetValue || 0),
      );
    }

    const cellMap = new Map();
    const productNames = new Set();

    for (const perf of performances) {
      const product = perf.product;
      if (!product?.depot) continue;

      const depotName = product.depot.name;
      const productName = product.name;
      productNames.add(productName);

      const key = `${depotName}::${productName}`;
      const existing = cellMap.get(key) || {
        depotName,
        productName,
        quantitySold: 0,
        revenue: 0,
        depotId: product.depotId,
      };
      existing.quantitySold += perf.quantitySold;
      existing.revenue += Number(perf.revenue || 0);
      cellMap.set(key, existing);
    }

    const productsPerDepot = new Map();
    for (const cell of cellMap.values()) {
      productsPerDepot.set(cell.depotId, (productsPerDepot.get(cell.depotId) || 0) + 1);
    }

    const depotMap = new Map();

    for (const cell of cellMap.values()) {
      if (!depotMap.has(cell.depotName)) {
        depotMap.set(cell.depotName, { depotName: cell.depotName, products: {} });
      }

      const depotTarget = targetByDepot.get(cell.depotId) || 0;
      const productCount = productsPerDepot.get(cell.depotId) || 1;
      // Without a depot target the cell cannot be scored; show 0 rather than
      // pretending sales exactly met a made-up target.
      const targetPerProduct = depotTarget > 0 ? depotTarget / productCount : 0;
      const kpiPercent = targetPerProduct > 0 ? (cell.quantitySold / targetPerProduct) * 100 : 0;

      depotMap.get(cell.depotName).products[cell.productName] = Number(
        Math.min(kpiPercent, 999).toFixed(1),
      );
    }

    return {
      productNames: Array.from(productNames).sort(),
      rows: Array.from(depotMap.values()).sort((a, b) => a.depotName.localeCompare(b.depotName)),
    };
  }

  async setTarget({ employeeId, depotId, month, targetQty }) {
    const monthDate = utcMonthStart(parseISO(`${month}-01`));

    const record = await prisma.employeeKPI.upsert({
      where: {
        employeeId_depotId_month: {
          employeeId: Number(employeeId),
          depotId: Number(depotId),
          month: monthDate,
        },
      },
      update: {
        targetValue: Number(targetQty),
        remarks: null,
      },
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
        employee: { select: { id: true, khmerName: true, englishName: true } },
        depot: { select: { id: true, name: true } },
      },
    });

    return record;
  }

  async getFilterOptions() {
    const [depots, products] = await Promise.all([
      prisma.depot.findMany({
        select: {
          id: true,
          name: true,
          district: {
            select: { name: true, province: { select: { name: true } } },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.product.findMany({
        select: { id: true, name: true, sku: true },
        orderBy: { name: "asc" },
        take: 500,
      }),
    ]);

    return {
      // Flatten geography so the UI can distinguish depots that share a name.
      depots: depots.map((d) => ({
        id: d.id,
        name: d.name,
        districtName: d.district?.name || null,
        provinceName: d.district?.province?.name || null,
      })),
      products,
    };
  }
}

export const kpiSystemService = new KpiSystemService();
