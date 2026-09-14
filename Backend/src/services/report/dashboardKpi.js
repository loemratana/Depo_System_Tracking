import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db.js";
import logger from "../../config/logger.js";
import { kpiSystemService } from "../kpiSystemService.js";

function monthDateBounds(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const fromDate = new Date(y, m, 1).toISOString().split("T")[0];
  const toDate = new Date(y, m + 1, 0).toISOString().split("T")[0];
  return { fromDate, toDate };
}

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

/**
 * Parses `YYYY-MM` or `YYYY-MM-DD` into a UTC month-start Date, truncating
 * any day-of-month. Digit-by-digit parsing (never `new Date(string)`) so the
 * result never drifts across a month boundary due to local timezone offset.
 */
function parseMonthBoundary(value, paramName) {
  if (typeof value === "string" && /^\d{4}-\d{2}$/.test(value)) {
    const [y, m] = value.split("-").map(Number);
    if (m < 1 || m > 12) throw badRequest(`\`${paramName}\` month must be between 01 and 12`);
    return new Date(Date.UTC(y, m - 1, 1));
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    const probe = new Date(Date.UTC(y, m - 1, d));
    if (Number.isNaN(probe.getTime()) || m < 1 || m > 12) {
      throw badRequest(`\`${paramName}\` is not a valid date`);
    }
    return new Date(Date.UTC(y, m - 1, 1));
  }
  throw badRequest(`\`${paramName}\` must be in YYYY-MM or YYYY-MM-DD format`);
}

function monthKey(date) {
  return date.toISOString().slice(0, 7);
}

function parsePositiveIntFilter(value, paramName) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw badRequest(`\`${paramName}\` must be a positive number`);
  }
  return num;
}

class DashboardKpi {
  async getDashboardKpis() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { fromDate, toDate } = monthDateBounds(today);

    const [
      [
        totalDepots,
        activeEmployees,
        totalEmployees,
        totalDepotsWithExpiry,
        totalBrands,
        vacancy,
      ],
      kpiSummary,
    ] = await Promise.all([
      Promise.all([
        prisma.depot.count(),
        prisma.employee.count({ where: { status: "active" } }),
        prisma.employee.count(),
        prisma.depot.count({
          where: {
            expiryDate: { lt: today },
          },
        }),
        prisma.brand.count(),
        prisma.depot.count({ where: { status: "vacancy" } }),
      ]),
      kpiSystemService.getSummary({ fromDate, toDate }).catch((error) => {
        logger.warn(
          `Dashboard KPI summary unavailable, using zeros: ${error.message}`,
        );
        return { averageKpi: 0, employeesAssessed: 0 };
      }),
    ]);

    logger.info(
      `Dashboard KPIs: depots=${totalDepots}, activeEmployees=${activeEmployees}, vacancy=${vacancy}, avgKpi=${kpiSummary.averageKpi}`,
    );

    return {
      brandDepots: totalDepots,
      handlers: activeEmployees,
      totalEmployees,
      expiredDepots: totalDepotsWithExpiry,
      totalBrands,
      vacancy,
      averageKpi: kpiSummary.averageKpi,
      employeesAssessed: kpiSummary.employeesAssessed,
    };
  }

  /**
   * Monthly PO quantity trend from brand_depot_month_kpis.
   * Returns the last `months` months ending at year/month (defaults: current).
   * Optional brandId filters to one brand; otherwise sums all brands.
   */
  async getMonthlyPoTrend({ year, month, brandId, months = 6 } = {}) {
    const now = new Date();
    const endYear = Number.isFinite(Number(year))
      ? Number(year)
      : now.getFullYear();
    const endMonth = Number.isFinite(Number(month))
      ? Number(month)
      : now.getMonth() + 1;
    const span = Math.min(Math.max(Number(months) || 6, 1), 12);

    if (endMonth < 1 || endMonth > 12) {
      throw new Error("month must be between 1 and 12");
    }

    const end = new Date(Date.UTC(endYear, endMonth - 1, 1));
    const start = new Date(
      Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - (span - 1), 1),
    );

    const brandFilter = brandId ? Number(brandId) : null;

    const results = brandFilter
      ? await prisma.$queryRaw`
          SELECT
            DATE_TRUNC('month', period_month) AS month,
            COALESCE(SUM(po_actual), 0)::float AS total_po
          FROM brand_depot_month_kpis
          WHERE period_month >= ${start}
            AND period_month <= ${end}
            AND brand_id = ${brandFilter}
          GROUP BY DATE_TRUNC('month', period_month)
          ORDER BY month ASC
        `
      : await prisma.$queryRaw`
          SELECT
            DATE_TRUNC('month', period_month) AS month,
            COALESCE(SUM(po_actual), 0)::float AS total_po
          FROM brand_depot_month_kpis
          WHERE period_month >= ${start}
            AND period_month <= ${end}
          GROUP BY DATE_TRUNC('month', period_month)
          ORDER BY month ASC
        `;

    const series = [];
    for (let i = span - 1; i >= 0; i--) {
      const date = new Date(
        Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - i, 1),
      );
      const found = results.find((r) => {
        const m = new Date(r.month);
        return (
          m.getUTCMonth() === date.getUTCMonth() &&
          m.getUTCFullYear() === date.getUTCFullYear()
        );
      });

      series.push({
        month: date.toLocaleString("en-US", {
          month: "short",
          timeZone: "UTC",
        }),
        year: date.getUTCFullYear(),
        count: Number(Number(found?.total_po ?? 0).toFixed(1)),
      });
    }

    return series;
  }

  /** @deprecated Use getMonthlyPoTrend */
  async getMonthlyAssignmentTrend(params = {}) {
    return this.getMonthlyPoTrend(params);
  }

  /**
   * PO Performance trend: monthly Target vs Actual, aggregated in the
   * database from brand_depot_month_kpis.
   *
   * Business rules (see class doc comment / KPI_ARCHITECTURE.md):
   *  - Target  = SUM(po_target) for the month  (a manager-entered monthly
   *              figure per depot+brand — never a row count).
   *  - Actual  = SUM(po_actual) for the month  (same source, same rule).
   *  - Achievement % = Actual / Target * 100, rounded to a whole number.
   *              Returns `null` when Target <= 0 — never divide by zero.
   *              (Matches brandMonthlyKpiService.getDashboardInsights()'s
   *              `attainmentPct` convention.)
   *  - Variance = Actual - Target, always computed (never null).
   *  - Months with no rows are filled with target=0/actual=0 so the caller
   *    gets a continuous series instead of gaps.
   *  - "owner" = the depot's assigned employee (Depot.employeeId) — this
   *    schema has no separate Owner entity.
   *
   * Filters (all optional): from/to (YYYY-MM or YYYY-MM-DD, inclusive of
   * that month on both ends), brandId, depotId, ownerId (-> depot.employeeId),
   * provinceId (-> depot.provinceId). Defaults to the trailing 6 months
   * ending this month when from/to are omitted. Capped at 36 months.
   */
  async getPoPerformanceTrend({ from, to, brandId, depotId, ownerId, provinceId } = {}) {
    const toDate = to ? parseMonthBoundary(to, "to") : (() => {
      const now = new Date();
      return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    })();
    const fromDate = from
      ? parseMonthBoundary(from, "from")
      : new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth() - 5, 1));

    if (fromDate.getTime() > toDate.getTime()) {
      throw badRequest("`from` must not be after `to`");
    }

    const monthSpan =
      (toDate.getUTCFullYear() - fromDate.getUTCFullYear()) * 12 +
      (toDate.getUTCMonth() - fromDate.getUTCMonth()) +
      1;
    if (monthSpan > 36) {
      throw badRequest("Date range too large — maximum 36 months");
    }

    const brandFilter = parsePositiveIntFilter(brandId, "brandId");
    const depotFilter = parsePositiveIntFilter(depotId, "depotId");
    const ownerFilter = parsePositiveIntFilter(ownerId, "ownerId");
    const provinceFilter = parsePositiveIntFilter(provinceId, "provinceId");

    const conditions = [
      Prisma.sql`bdmk.period_month >= ${fromDate}`,
      Prisma.sql`bdmk.period_month <= ${toDate}`,
    ];
    if (brandFilter) conditions.push(Prisma.sql`bdmk.brand_id = ${brandFilter}`);
    if (depotFilter) conditions.push(Prisma.sql`bdmk.depot_id = ${depotFilter}`);
    if (ownerFilter) conditions.push(Prisma.sql`d.employee_id = ${ownerFilter}`);
    if (provinceFilter) conditions.push(Prisma.sql`d.province_id = ${provinceFilter}`);

    // Only join depots when a depot-relational filter needs it.
    const joinClause =
      ownerFilter || provinceFilter
        ? Prisma.sql`INNER JOIN depots d ON d.id = bdmk.depot_id`
        : Prisma.empty;

    const results = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', bdmk.period_month) AS month,
        COALESCE(SUM(bdmk.po_target), 0)::float AS total_target,
        COALESCE(SUM(bdmk.po_actual), 0)::float AS total_actual
      FROM brand_depot_month_kpis bdmk
      ${joinClause}
      WHERE ${Prisma.join(conditions, " AND ")}
      GROUP BY DATE_TRUNC('month', bdmk.period_month)
      ORDER BY month ASC
    `;

    const series = [];
    for (let i = 0; i < monthSpan; i++) {
      const date = new Date(
        Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth() + i, 1),
      );
      const found = results.find((r) => {
        const m = new Date(r.month);
        return (
          m.getUTCFullYear() === date.getUTCFullYear() &&
          m.getUTCMonth() === date.getUTCMonth()
        );
      });

      const target = Number(Number(found?.total_target ?? 0).toFixed(1));
      const actual = Number(Number(found?.total_actual ?? 0).toFixed(1));

      series.push({
        month: monthKey(date),
        target,
        actual,
        achievementPercent: target > 0 ? Math.round((actual / target) * 100) : null,
        variance: Number((actual - target).toFixed(1)),
      });
    }

    return series;
  }

  /**
   * Brand distribution for dashboard pie chart.
   * Returns depot count (created in month) and product qty sold that month per brand.
   * Query: year (e.g. 2026), month (1–12). Defaults to current month.
   */
  async getBrandDistribution({ year, month } = {}) {
    const now = new Date();
    const y = Number.isFinite(Number(year)) ? Number(year) : now.getFullYear();
    const m = Number.isFinite(Number(month)) ? Number(month) : now.getMonth() + 1;

    if (m < 1 || m > 12) {
      throw new Error("month must be between 1 and 12");
    }

    const start = new Date(y, m - 1, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(y, m, 0, 23, 59, 59, 999);

    const rows = await prisma.$queryRaw`
      WITH depot_counts AS (
        SELECT brand_id, COUNT(*)::int AS depot_count
        FROM depots
        WHERE brand_id IS NOT NULL
          AND created_at >= ${start}
          AND created_at <= ${end}
        GROUP BY brand_id
      ),
      qty_by_brand AS (
        SELECT p.brand_id, COALESCE(SUM(pp.quantity_sold), 0)::int AS product_quantity
        FROM product_performances pp
        INNER JOIN products p ON p.id = pp.product_id
        WHERE pp.month >= ${start}
          AND pp.month <= ${end}
        GROUP BY p.brand_id
      ),
      stock_by_brand AS (
        SELECT brand_id, COALESCE(SUM(quantity), 0)::int AS stock_quantity
        FROM products
        GROUP BY brand_id
      ),
      all_depot_counts AS (
        SELECT brand_id, COUNT(*)::int AS total_depots
        FROM depots
        WHERE brand_id IS NOT NULL
        GROUP BY brand_id
      )
      SELECT
        b.id AS brand_id,
        b.name AS brand_name,
        COALESCE(adc.total_depots, 0)::int AS depot_count,
        COALESCE(dc.depot_count, 0)::int AS new_depots_month,
        COALESCE(qb.product_quantity, 0)::int AS product_quantity,
        COALESCE(sb.stock_quantity, 0)::int AS stock_quantity
      FROM brands b
      LEFT JOIN all_depot_counts adc ON adc.brand_id = b.id
      LEFT JOIN depot_counts dc ON dc.brand_id = b.id
      LEFT JOIN qty_by_brand qb ON qb.brand_id = b.id
      LEFT JOIN stock_by_brand sb ON sb.brand_id = b.id
      WHERE COALESCE(adc.total_depots, 0) > 0
         OR COALESCE(qb.product_quantity, 0) > 0
         OR COALESCE(sb.stock_quantity, 0) > 0
      ORDER BY COALESCE(adc.total_depots, 0) DESC, b.name ASC
    `;

    return {
      year: y,
      month: m,
      from: start.toISOString(),
      to: end.toISOString(),
      brands: rows.map((r) => ({
        brandId: Number(r.brand_id),
        name: r.brand_name,
        depotCount: Number(r.depot_count) || 0,
        newDepotsMonth: Number(r.new_depots_month) || 0,
        productQuantity: Number(r.product_quantity) || 0,
        stockQuantity: Number(r.stock_quantity) || 0,
      })),
    };
  }

  // Optional: Depot creation trend (if needed for another chart)
  async getMonthlyDepotTrend() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const results = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "created_at") AS month,
        COUNT(*) AS count
      FROM "depots"
      WHERE "created_at" >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', "created_at")
      ORDER BY month ASC
    `;

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const filled = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const target = new Date();
      target.setMonth(today.getMonth() - i);
      target.setDate(1);
      const targetMonth = target.getMonth();
      const targetYear = target.getFullYear();

      const existing = results.find((r) => {
        const dbMonth = new Date(r.month);
        return (
          dbMonth.getFullYear() === targetYear &&
          dbMonth.getMonth() === targetMonth
        );
      });

      filled.push({
        month: monthNames[targetMonth],
        count: existing ? Number(existing.count) : 0,
      });
    }

    return filled;
  }
}

export default new DashboardKpi();