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

class DashboardKpi {
  async getDashboardKpis() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { fromDate, toDate } = monthDateBounds(today);

    const [
      totalDepots,
      activeEmployees,
      totalEmployees,
      totalDepotsWithExpiry,
      totalBrands,
      vacancy,
    ] = await Promise.all([
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
    ]);

    let kpiSummary = { averageKpi: 0, employeesAssessed: 0 };
    try {
      kpiSummary = await kpiSystemService.getSummary({ fromDate, toDate });
    } catch (error) {
      logger.warn(
        `Dashboard KPI summary unavailable, using zeros: ${error.message}`,
      );
    }

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