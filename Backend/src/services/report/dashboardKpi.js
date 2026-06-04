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