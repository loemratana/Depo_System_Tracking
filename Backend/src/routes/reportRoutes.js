// routes/kpiRoutes.js
import express from 'express';
import dashboardController from '../controllers/kpiController.js';
const router = express.Router();

// GET /api/kpis/dashboard
router.get('/dashboard', dashboardController.getDashboardKpisHandler);
router.get('/assignment-trend', dashboardController.getAssignmentTrend);

export default router;