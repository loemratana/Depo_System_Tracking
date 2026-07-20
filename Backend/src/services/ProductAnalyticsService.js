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
        const {
            fromDate,
            toDate,
            depotId,
            brandId,
            employeeId,
            search,
            page = 1,
            limit = 10,
            sortBy = 'quantitySold',
            sortOrder = 'desc'
        } = filters;

        const start = startOfDay(new Date(fromDate));
        const end = endOfDay(new Date(toDate));
        const periodDays = differenceInDays(end, start) + 1;
        const prevEnd = startOfDay(subDays(start, 1));
        const prevStart = startOfDay(subDays(prevEnd, periodDays - 1));

        const productFilter = {};
        if (depotId) productFilter.depotId = parseInt(depotId, 10);
        if (brandId) productFilter.brandId = parseInt(brandId, 10);

        const hasProductFilter = Object.keys(productFilter).length > 0;

        // --- Where clause for current period ---
        const whereCurrent = {
            month: { gte: start, lte: end },
            ...(employeeId && { employeeId: parseInt(employeeId, 10) }),
            ...(hasProductFilter && { product: productFilter }),
        };

        // --- Current period aggregation ---
        const currentData = await prisma.productPerformance.groupBy({
            by: ['productId', 'employeeId'],
            where: whereCurrent,
            _sum: {
                quantitySold: true,
                revenue: true,
            },
        });

        if (!currentData.length) {
            return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
        }

        // --- Fetch related product & employee details ---
        const productIds = [...new Set(currentData.map(d => d.productId))];
        const employeeIds = [...new Set(currentData.map(d => d.employeeId))];

        const [products, employees] = await Promise.all([
            prisma.product.findMany({
                where: { id: { in: productIds } },
                select: {
                    id: true,
                    name: true,
                    sku: true,
                    depotId: true,
                    depot: { select: { id: true, name: true } },
                },
            }),
            prisma.employee.findMany({
                where: { id: { in: employeeIds } },
                select: { id: true, englishName: true, khmerName: true },
            }),
        ]);

        const productMap = new Map(products.map(p => [p.id, p]));
        const employeeMap = new Map(employees.map(e => [e.id, e]));

        // --- Previous period aggregation ---
        const prevData = await prisma.productPerformance.groupBy({
            by: ['productId', 'employeeId'],
            where: {
                month: { gte: prevStart, lte: prevEnd },
                ...(employeeId && { employeeId: parseInt(employeeId, 10) }),
                ...(hasProductFilter && { product: productFilter }),
            },
            _sum: {
                quantitySold: true,
                revenue: true,
            },
        });

        const prevMap = new Map();
        for (const p of prevData) {
            const key = `${p.productId}-${p.employeeId}`;
            prevMap.set(key, {
                quantitySold: p._sum.quantitySold || 0,
                revenue: p._sum.revenue || 0,
            });
        }

        // --- Build all rows (without pagination yet) ---
        const allRows = [];
        for (const curr of currentData) {
            const product = productMap.get(curr.productId);
            const employee = employeeMap.get(curr.employeeId);
            if (!product || !employee) continue;

            const depot = product.depot;
            if (!depot) continue;

            // Apply search filter
            if (search) {
                const term = search.toLowerCase();
                const matchProduct = product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term);
                const matchEmployee = employee.englishName?.toLowerCase().includes(term) || employee.khmerName?.toLowerCase().includes(term);
                if (!matchProduct && !matchEmployee) continue;
            }

            const currentQty = curr._sum.quantitySold || 0;
            const currentRevenue = curr._sum.revenue || 0;

            const key = `${curr.productId}-${curr.employeeId}`;
            const prev = prevMap.get(key) || { quantitySold: 0, revenue: 0 };
            const prevQty = prev.quantitySold;

            let growth = 0;
            if (prevQty > 0) {
                growth = ((currentQty - prevQty) / prevQty) * 100;
            } else if (currentQty > 0) {
                growth = 100;
            }

            allRows.push({
                id: `${curr.productId}-${curr.employeeId}`,
                productName: product.name,
                productSku: product.sku,
                employeeName: employee.englishName || employee.khmerName || 'Unknown',
                depotName: depot.name,
                quantitySold: currentQty,
                previousQuantity: prevQty,
                revenue: currentRevenue,
                growth: parseFloat(growth.toFixed(1)),
            });
        }

        // --- Sorting ---
        const sortFieldMap = {
            quantitySold: 'quantitySold',
            revenue: 'revenue',
            growth: 'growth',
            productName: 'productName',
            employeeName: 'employeeName',
        };
        const sortField = sortFieldMap[sortBy] || 'quantitySold';
        allRows.sort((a, b) => {
            const valA = a[sortField] ?? 0;
            const valB = b[sortField] ?? 0;
            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return sortOrder === 'asc' ? valA - valB : valB - valA;
        });

        // --- Pagination ---
        const total = allRows.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const paginatedRows = allRows.slice(offset, offset + limit);

        return {
            data: paginatedRows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages,
            },
        };
    }

    /**
     * Get list of depots for filter dropdown
     */
    async getDepotOptions() {
        const depots = await prisma.depot.findMany({
            select: {
                id: true,
                name: true,
                district: {
                    select: { name: true, province: { select: { name: true } } }
                }
            },
            orderBy: { name: 'asc' }
        });

        // Flatten geography so the UI can distinguish depots that share a name.
        return depots.map((d) => ({
            id: d.id,
            name: d.name,
            districtName: d.district?.name || null,
            provinceName: d.district?.province?.name || null,
        }));
    }

    async getMonthlySales(filters) {
        const { fromDate, toDate, depotId, brandId, employeeId, productId } = filters;
        const start = new Date(fromDate);
        const end = new Date(toDate);

        const productFilter = {};
        if (depotId) productFilter.depotId = parseInt(depotId, 10);
        if (brandId) productFilter.brandId = parseInt(brandId, 10);

        const performances = await prisma.productPerformance.groupBy({
            by: ['month'],
            where: {
                month: { gte: start, lte: end },
                ...(employeeId ? { employeeId: parseInt(employeeId, 10) } : {}),
                ...(productId ? { productId: parseInt(productId, 10) } : {}),
                ...(Object.keys(productFilter).length > 0 ? { product: productFilter } : {}),
            },
            _sum: { quantitySold: true, revenue: true },
            orderBy: { month: 'asc' },
        });

        return {
            months: performances.map(p => p.month.toLocaleString('default', { month: 'short', year: 'numeric' })),
            quantities: performances.map(p => p._sum.quantitySold || 0),
            revenues: performances.map(p => p._sum.revenue || 0),
        };
    }

    async getDailySales(filters) {
        const { fromDate, toDate, depotId, employeeId } = filters;
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);

        // Build day buckets for the requested range
        const dayKeys = [];
        const cursor = new Date(start);
        while (cursor <= end) {
            dayKeys.push(cursor.toISOString().slice(0, 10));
            cursor.setDate(cursor.getDate() + 1);
        }

        const performances = await prisma.productPerformance.findMany({
            where: {
                createdAt: { gte: start, lte: end },
                ...(employeeId ? { employeeId: parseInt(employeeId, 10) } : {}),
                ...(depotId
                    ? { product: { depotId: parseInt(depotId, 10) } }
                    : {}),
            },
            select: {
                createdAt: true,
                quantitySold: true,
                revenue: true,
            },
        });

        const byDay = Object.fromEntries(
            dayKeys.map((key) => [key, { quantity: 0, revenue: 0 }]),
        );

        for (const row of performances) {
            const key = row.createdAt.toISOString().slice(0, 10);
            if (!byDay[key]) continue;
            byDay[key].quantity += Number(row.quantitySold || 0);
            byDay[key].revenue += Number(row.revenue || 0);
        }

        return {
            labels: dayKeys.map((key) =>
                new Date(`${key}T00:00:00`).toLocaleDateString("en", {
                    weekday: "short",
                }),
            ),
            quantities: dayKeys.map((key) => byDay[key].quantity),
            revenues: dayKeys.map((key) => Number(byDay[key].revenue.toFixed(2))),
        };
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

export default new ProductAnalyticsService();

