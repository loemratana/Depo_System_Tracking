import { prisma } from "../../config/db.js";
import logger from "../../config/logger.js";
import { EmployeeStatus } from "@prisma/client";

class DashboardKpi {
  async getDashboardKpis() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalDepots,
      activeEmployees,
      expiredDepots,
      user
    ] = await Promise.all([
      prisma.depot.count(),

      prisma.employee.count({
        where: {
          status: "active",
        },
      }),



      // prisma.depot.count({
      //   where: {
      //     expiryDate: { lt: today }, // FIXED CASE
      //   },
      // }),

      prisma.employee.count(),
      prisma.user.count(),
    ]);

    logger.info(`total kpi ${totalDepots} ,${activeEmployees}`);

    return {
      brandDepots: totalDepots,
      handlers: activeEmployees,
      expiredDepots: expiredDepots,
      user: user
    };
  }

  /**
 * Get monthly assignment count for the last 6 months (including current month)
 * Uses Assignment.startDate to determine when the assignment was created/started.
 * @returns {Promise<Array>} [{ month, count }]
 */

  async getMonthlyAssignmentTrend() {
    // Calculate date 6 months ago (first day of that month)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); // to include current month as last
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // PostgreSQL grouping by month using start_date (mapped to startDate in Prisma)
    const results = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('month', "start_date") AS month,
      COUNT(*) AS count
    FROM "assignments"
    WHERE "start_date" >= ${sixMonthsAgo}
    GROUP BY DATE_TRUNC('month', "start_date")
    ORDER BY month ASC
  `;

    // Month names for formatting
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Generate the last 6 months (including current) and fill missing months with 0
    const filled = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const target = new Date();
      target.setMonth(today.getMonth() - i);
      target.setDate(1);
      const targetStart = new Date(target.getFullYear(), target.getMonth(), 1);
      const targetEnd = new Date(target.getFullYear(), target.getMonth() + 1, 0);

      const existing = results.find(r => {
        const dbMonth = new Date(r.month);
        return dbMonth.getFullYear() === target.getFullYear() && dbMonth.getMonth() === target.getMonth();
      });

      filled.push({
        month: monthNames[target.getMonth()],
        count: existing ? Number(existing.count) : 0,
      });
    }

    return filled;
  }


}

export default new DashboardKpi();