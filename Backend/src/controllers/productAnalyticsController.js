
import { productAnalyticsService } from "../services/productAnalyticsService.js";

export const productAnalyticsController = {
    async getPerformance(req, res, next) {
        try {
            const { fromDate, toDate, depotId, brandId, employeeId, search, page, limit, sortBy, sortOrder } = req.query;
            const result = await productAnalyticsService.getProductPerformance({
                fromDate,
                toDate,
                depotId,
                brandId,
                employeeId,
                search,
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
                sortBy: sortBy || 'quantitySold',
                sortOrder: sortOrder || 'desc',
            });
            res.json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    },
    async getMonthlySales(req, res, next) {
        try {
            const { fromDate, toDate, depotId, brandId, employeeId, productId } = req.query;
            if (!fromDate || !toDate) {
                return res.status(400).json({ error: "fromDate and toDate are required" });
            }
            const data = await productAnalyticsService.getMonthlySales({
                fromDate,
                toDate,
                depotId: depotId ? parseInt(depotId, 10) : undefined,
                brandId: brandId ? parseInt(brandId, 10) : undefined,
                employeeId: employeeId ? parseInt(employeeId, 10) : undefined,
                productId: productId ? parseInt(productId, 10) : undefined,
            });
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    },

    async getDepotOptions(req, res, next) {
        try {
            const depots = await productAnalyticsService.getDepotOptions();
            res.json({ success: true, data: depots });
        } catch (error) {
            next(error);
        }
    },

    async getEmployeeOptions(req, res, next) {
        try {
            const employees = await productAnalyticsService.getEmployeeOptions();
            res.json({ success: true, data: employees });
        } catch (error) {
            next(error);
        }
    },

    async getDailySales(req, res, next) {
        try {
            const { fromDate, toDate, depotId, employeeId } = req.query;
            if (!fromDate || !toDate) {
                return res.status(400).json({
                    success: false,
                    error: "fromDate and toDate are required",
                });
            }
            const data = await productAnalyticsService.getDailySales({
                fromDate,
                toDate,
                depotId: depotId ? parseInt(depotId, 10) : undefined,
                employeeId: employeeId ? parseInt(employeeId, 10) : undefined,
            });
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    },
};