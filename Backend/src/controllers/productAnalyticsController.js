
import { productAnalyticsService } from "../services/productAnalyticsService.js";

export const productAnalyticsController = {
    async getPerformance(req, res, next) {
        try {
            const { fromDate, toDate, depotId, employeeId, search } = req.query;
            if (!fromDate || !toDate) {
                return res.status(400).json({ error: "fromDate and toDate are required" });
            }
            const data = await productAnalyticsService.getProductPerformance({
                fromDate,
                toDate,
                depotId: depotId ? parseInt(depotId) : undefined,
                employeeId: employeeId ? parseInt(employeeId) : undefined,
                search
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
    }
};