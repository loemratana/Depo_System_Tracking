import { Router } from "express";
import { productAnalyticsController } from "../controllers/productAnalyticsController.js";

const router = Router();

router.get("/performance", productAnalyticsController.getPerformance);
router.get("/depots", productAnalyticsController.getDepotOptions);
router.get("/employees", productAnalyticsController.getEmployeeOptions);

export default router;