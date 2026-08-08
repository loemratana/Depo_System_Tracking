import express from "express";
import BrandController from "../controllers/brandController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();
const { authenticate } = authMiddleware;

router.use(authenticate);

router.get("/", BrandController.getAllBrands);
router.get("/:id/summary", BrandController.getBrandSummary);
router.get("/:id", BrandController.getBrandById);
router.post("/", BrandController.createBrand);
router.patch("/:id", BrandController.updateBrand);
router.delete("/:id", BrandController.deleteBrand);
router.get("/:id/depots", BrandController.getCountDepots);
router.get("/:brandId/depotsByDepots", BrandController.getDepotByBrand);

export default router;
