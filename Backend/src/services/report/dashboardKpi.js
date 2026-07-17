import { prisma } from "../../config/db.js";
import logger from "../../config/logger.js";

class DashboardKpi {
  async getDashboardKpis() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalDepots,
      activeEmployees,
      totalEmployees,
      totalDepotsWithExpiry,
    ] = await Promise.all([
      prisma.depot.count(),
      prisma.employee.count({ where: { status: "active" } }),
      prisma.employee.count(),
      prisma.depot.count({
        where: {
          expiryDate: { lt: today },
        },
      }),
    ]);

    logger.info(
      `Dashboard KPIs: depots=${totalDepots}, activeEmployees=${activeEmployees}`,
    );

    return {
      brandDepots: totalDepots,
      handlers: activeEmployees,
      totalEmployees: totalEmployees,
      expiredDepots: totalDepotsWithExpiry,
      // user count removed – no User model
    };
  }

  /**
   * Since no assignments table exists, we provide an alternative trend:
   * Monthly employee hire trend (last 6 months) as a placeholder.
   * If you need depot creation trend, replace with depot.createdAt.
   */
  async getMonthlyAssignmentTrend() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const results = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', hire_date) AS month,
      COUNT(*)::int AS count
      FROM employees
      WHERE hire_date >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', hire_date)
      ORDER BY month ASC
    `;

    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);

      const found = results.find((r) => {
        const m = new Date(r.month);
        return (
          m.getMonth() === date.getMonth() &&
          m.getFullYear() === date.getFullYear()
        );
      });

      months.push({
        month: date.toLocaleString("en-US", { month: "short" }),
        count: found?.count ?? 0,
      });
    }

    return months;
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