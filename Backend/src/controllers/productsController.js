// controllers/product.controller.js
import { productService } from "../services/productsServices.js";

export class ProductController {
    /**
     * 1.CREATE PRODUCT
     */
    async create(req, res, next) {
        try {
            const product = await productService.create(req.body);
            res.status(201).json({
                success: true,
                message: "Product created successfully",
                data: product
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 2. 📋 GET ALL PRODUCTS
     */
    async findAll(req, res, next) {
        try {
            const result = await productService.findAll(req.query);
            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 3.GET PRODUCT BY ID
     */
    async findById(req, res, next) {
        try {
            const { id } = req.params;
            const product = await productService.findById(id);
            res.json({
                success: true,
                data: product
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 4.UPDATE STOCK
     */
    async updateStock(req, res, next) {
        try {
            const { id } = req.params;
            const { quantity, reason, employeeId } = req.body;

            const product = await productService.updateStock(id, quantity, reason, employeeId);

            res.json({
                success: true,
                message: "Stock updated successfully",
                data: product
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/products/sales
     * Record a sale (decreases stock, updates ProductPerformance & EmployeeKPI)
     */
    async recordSale(req, res, next) {
        try {
            const { productId, employeeId, quantitySold, saleDate } = req.body;
            const result = await productService.recordSale(
                productId,
                employeeId,
                quantitySold,
                saleDate ? new Date(saleDate) : new Date()
            );
            res.status(201).json({
                success: true,
                message: "Sale recorded successfully",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 5. UPDATE MIN STOCK
     */
    async updateMinStock(req, res, next) {
        try {
            const { id } = req.params;
            const { minStock } = req.body;

            const product = await productService.updateMinStock(id, minStock);

            res.json({
                success: true,
                message: "Minimum stock level updated successfully",
                data: product
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 7. 🚨 LOW STOCK PRODUCTS
     */
    async getLowStockProducts(req, res, next) {
        try {
            const { depotId } = req.query;
            const products = await productService.getLowStockProducts(depotId);

            res.json({
                success: true,
                count: products.length,
                data: products
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * 8. 📊 PRODUCT PERFORMANCE
     */
    async getProductPerformance(req, res, next) {
        try {
            const { id } = req.params;
            const { year, month } = req.query;

            const currentYear = year || new Date().getFullYear();
            const currentMonth = month || new Date().getMonth() + 1;

            const performance = await productService.getProductPerformance(
                id, parseInt(currentYear), parseInt(currentMonth)
            );

            res.json({
                success: true,
                data: performance
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete product (soft delete)
     */
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            await productService.delete(id);
            res.json({
                success: true,
                message: "Product deleted successfully"
            });
        } catch (error) {
            next(error);
        }
    }
}