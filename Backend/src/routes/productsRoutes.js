// routes/product.routes.js
import { Router } from "express";
import { ProductController } from "../controllers/productsController.js";
import {
    createProductSchema,
    updateStockSchema,
    updatePriceSchema,
    updateMinStockSchema
} from "../validators/product.validator.js";

const router = Router();
const productController = new ProductController();

// 1. Create Product
router.post("/",productController.create);

// 2. Get All Products
router.get("/", productController.findAll);

router.post("/sales", productController.recordSale);   // POST for sales


// 3. Get Product by ID
router.get("/:id", productController.findById);

// 4. Update Stock
router.patch("/:id/stock", productController.updateStock);

// 5. Update Price
router.patch("/:id/price", productController.updatePrice);

// 6. ⚠Update Min Stock
router.patch("/:id/min-stock", productController.updateMinStock);


router.post("/sales", productController.recordSale);


// 7. Low Stock Products
router.get("/low-stock", productController.getLowStockProducts);

// 8. Product Performance
router.get("/:id/performance", productController.getProductPerformance);

// Delete product
router.delete("/:id", productController.delete);

export default router;