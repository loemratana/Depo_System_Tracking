import { prisma } from "../config/db.js";
import { startOfDay, endOfDay, subDays, differenceInDays } from "date-fns";

class ProductAnalyticsService {
    /**
     * Get product performance data with filters and growth calculation
     * @param {Object} filters
     * @param {string} filters.fromDate - YYYY-MM-DD
     * @param {string} filters.toDate - YYYY-MM-DD
     * @param {number} filters.depotId - optional
     * @param {number} filters.employeeId - optional
     * @param {string} filters.search - optional search in product name/sku or employee name
     * @returns {Promise<Array>} performance rows
     */
    async getProductPerformance(filters) {
        const { fromDate, toDate, depotId, employeeId, search } = filters;

        // Convert date strings to Date objects (inclusive range)
        const start = startOfDay(new Date(fromDate));
        const end = endOfDay(new Date(toDate));
        const periodDays = differenceInDays(end, start) + 1;

        // Previous period (same length before fromDate)
        const prevEnd = startOfDay(subDays(start, 1));
        const prevStart = startOfDay(subDays(prevEnd, periodDays - 1));

        // Base where clause for current period
        const whereCurrent = {
            month: { gte: start, lte: end }
        };
        if (employeeId) whereCurrent.employeeId = parseInt(employeeId);
        // Filter by depot: need to join through employee's depot
        // We'll handle in include

        // First, get current period data grouped by product, employee, depot
        const currentData = await prisma.productPerformance.groupBy({
            by: ['productId', 'employeeId'],
            where: whereCurrent,
            _sum: {
                quantitySold: true,
                revenue: true
            },
            orderBy: {
                productId: 'asc'
            }
        });

        if (!currentData.length) return [];

        // Get product, employee, depot details
        const productIds = [...new Set(currentData.map(d => d.productId))];
        const employeeIds = [...new Set(currentData.map(d => d.employeeId))];

        const [products, employees] = await Promise.all([
            prisma.product.findMany({
                where: { id: { in: productIds } },
                select: { id: true, name: true, sku: true }
            }),
            prisma.employee.findMany({
                where: { id: { in: employeeIds } },
                include: {
                    depots: {  // assuming employee has depots relation
                        select: { id: true, name: true }
                    }
                }
            })
        ]);

        const productMap = new Map(products.map(p => [p.id, p]));
        const employeeMap = new Map(employees.map(e => [e.id, e]));

        // Build rows
        const rows = [];
        for (const item of currentData) {
            const product = productMap.get(item.productId);
            const employee = employeeMap.get(item.employeeId);
            if (!product || !employee) continue;

            const depot = employee.depots?.[0]; // first assigned depot
            if (depotId && depot?.id !== parseInt(depotId)) continue;

            // Apply search filter (product name/sku or employee name)
            if (search) {
                const term = search.toLowerCase();
                const matchProduct = product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term);
                const matchEmployee = employee.name.toLowerCase().includes(term);
                if (!matchProduct && !matchEmployee) continue;
            }

            const currentQty = item._sum.quantitySold || 0;
            const currentRevenue = item._sum.revenue || 0;

            // Get previous period quantity for the same product+employee
            const prevData = await prisma.productPerformance.aggregate({
                where: {
                    productId: item.productId,
                    employeeId: item.employeeId,
                    month: { gte: prevStart, lte: prevEnd }
                },
                _sum: {
                    quantitySold: true,
                    revenue: true
                }
            });
            const prevQty = prevData._sum.quantitySold || 0;

            let growth = 0;
            if (prevQty > 0) {
                growth = ((currentQty - prevQty) / prevQty) * 100;
            } else if (currentQty > 0) {
                growth = 100; // from zero to positive
            }

            rows.push({
                id: `${item.productId}-${item.employeeId}`, // composite key
                productName: product.name,
                productSku: product.sku,
                employeeName: employee.englishName || employee.khmerName,
                depotName: depot?.name || "Unassigned",
                quantitySold: currentQty,
                revenue: currentRevenue,
                growth: parseFloat(growth.toFixed(1))
            });
        }

        return rows;
    }

    /**
     * Get list of depots for filter dropdown
     */
    async getDepotOptions() {
        return prisma.depot.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        });
    }

    /**
     * Get list of employees for filter dropdown
     */
    async getEmployeeOptions() {
        const employees = await prisma.employee.findMany({
            select: { id: true, englishName: true },  // use englishName field
            orderBy: { englishName: 'asc' }
        });
        // Map to { id, name } for frontend compatibility
        return employees.map(emp => ({
            id: emp.id,
            name: emp.englishName
        }));
    }
}

export const productAnalyticsService = new ProductAnalyticsService();