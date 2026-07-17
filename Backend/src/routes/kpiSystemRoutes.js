import express from "express";
import authMiddleware from "../middleware/auth.js";
import kpiSystemController from "../controllers/kpiSystemController.js";

const router = express.Router();
const { authenticate } = authMiddleware;

router.get("/options", authenticate, kpiSystemController.getFilterOptions);
router.get("/summary", authenticate, kpiSystemController.getSummary);
router.get("/matrix", authenticate, kpiSystemController.getMatrix);
router.get("/", authenticate, kpiSystemController.getRankings);
router.post("/targets", authenticate, kpiSystemController.setTarget);

export default router;
