import express from "express";
import BrandController from "../controllers/brandController.js";
const router = express.Router();

router.get("/", BrandController.getAllBrands);
router.get("/:id", BrandController.getBrandById);
router.post("/", BrandController.createBrand);
router.patch("/:id", BrandController.updateBrand);
router.delete("/:id", BrandController.deleteBrand);
router.get("/:id/depots", BrandController.getCountDepots);

export default router;
