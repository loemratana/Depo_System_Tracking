// routes/kpiRoutes.js
import express from "express";
import dashboardController from "../controllers/kpiController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();
const { authenticate } = authMiddleware;

router.use(authenticate);

// GET /api/kpis/dashboard
router.get("/dashboard", dashboardController.getDashboardKpisHandler);
router.get("/dashboard-brand", dashboardController.getDashboardBrand);
router.get("/dashboard-insights", dashboardController.getDashboardInsights);
router.get("/assignment-trend", dashboardController.getAssignmentTrend);
router.get("/brand-distribution", dashboardController.getBrandDistribution);
router.get("/brand-monthly", dashboardController.getBrandMonthlyReport);
router.get("/brand-yearly", dashboardController.getBrandYearlyReport);

export default router;
