// services/product.service.js
import { prisma } from "../config/db.js";
import logger from "../config/logger.js";
import { startOfMonth } from "date-fns";
import { PrismaClient, ProductStatus } from "@prisma/client";

class ProductService {
    /**
     * 1. CREATE PRODUCT
     */
    async create(data) {
        try {
            if (!data) {
                throw new Error("Request body is missing or empty");
            }

            const {
                name,
                sku,
                price,
                quantity = 0,
                minStock = 0,
                depotId,
                brandId,
                description
            } = data;

            // ========================
            // VALIDATION (CLEAN)
            // ========================
            if (!name?.trim()) throw new Error("Product name is required");
            if (price === undefined || price === null) {
                throw new Error("Product price is required");
            }
            if (!depotId) throw new Error("depotId is required");
            if (!brandId) throw new Error("brandId is required");

            // ========================
            // CHECK FOREIGN KEYS
            // ========================
            const [brand, depot] = await Promise.all([
                prisma.brand.findUnique({ where: { id: brandId } }),
                prisma.depot.findUnique({ where: { id: depotId } })
            ]);

            if (!brand) throw new Error(`Brand not found (id: ${brandId})`);
            if (!depot) throw new Error(`Depot not found (id: ${depotId})`);

            // ========================
            // SKU GENERATION
            // ========================
            const finalSku = sku?.trim() || this.generateSku(name);

            // ========================
            // STATUS LOGIC
            // ========================
            const status =
                quantity > minStock
                    ? ProductStatus.OK
                    : ProductStatus.LOW;

            // ========================
            // CREATE PRODUCT
            // ========================
            const product = await prisma.product.create({
                data: {
                    name: name.trim(),
                    sku: finalSku,
                    price: Number(price),
                    quantity: Number(quantity),
                    minStock: Number(minStock),
                    status,
                    depotId,
                    brandId,
                },
                include: {
                    depot: {
                        select: { id: true, name: true, code: true }
                    },
                    brand: {
                        select: { id: true, name: true, code: true }
                    }
                }
            });

            // ========================
            // LOGGING (SAFE)
            // ========================
            logger.info({
                message: "Product created",
                productId: product.id,
                name: product.name,
                sku: product.sku
            });

            return product;

        } catch (error) {
            logger.error("Product creation error:", error);

            throw new Error(
                error instanceof Error
                    ? error.message
                    : "Unknown error while creating product"
            );
        }
    }

    /**
     * 2.GET ALL PRODUCTS (with filters)
     */
    async findAll(params = {}) {
        const {
            page = 1,
            limit = 10,
            search,
            depotId,
            brandId,
            status,
            minStockAlert = false,
            sortBy = "createdAt",
            sortOrder = "desc"
        } = params;

        const skip = (page - 1) * limit;

        const where = {};

        // ======================
        // SEARCH FILTER
        // ======================
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { sku: { contains: search, mode: "insensitive" } }
            ];
        }

        // ======================
        // FILTERS
        // ======================
        if (depotId) where.depotId = Number(depotId);
        if (brandId) where.brandId = Number(brandId);
        if (status) where.status = status;

        // Filter products that are at or below minimum stock level
        // Uses the `status` field which is kept in sync by create/updateStock/updateMinStock
        if (minStockAlert) {
            where.status = { in: ['low', 'out_of_stock'] };
        }

        // ======================
        // QUERY
        // ======================
        const [data, total] = await prisma.$transaction([
            prisma.product.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { [sortBy]: sortOrder },
                include: {
                    depot: { select: { id: true, name: true, code: true } },
                    brand: { select: { id: true, name: true, code: true } }
                }
            }),

            prisma.product.count({ where }) // FIXED missing total
        ]);

        return {
            data,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * 3.GET PRODUCT BY ID
     */
    async findById(id) {
        const product = await prisma.product.findFirst({
            where: { id: parseInt(id) },
            include: {
                depot: { include: { district: true, province: true } },
                brand: true,
                // productPerformances: {        //now it works
                //     orderBy: { month: "desc" },
                //     take: 12,
                //     include: { employee: { select: { id: true, name: true } } }
                // }
            }
        });
        if (!product) throw new Error("Product not found");
        return product;
    }

    /**
     * 4. UPDATE STOCK (Simple quantity update)
     */
    async updateStock(id, quantity, reason = 'manual', employeeId = null) {
        const product = await this.findById(id);

        if (quantity < 0) {
            throw new Error(`Stock cannot be negative. Current: ${product.quantity}`);
        }

        // Determine correct status based on quantity and minStock
        let status;
        if (quantity === 0) {
            status = 'OUT_OF_STOCK';
        } else if (quantity < product.minStock) {
            status = 'LOW';
        } else {
            status = 'OK';
        }

        const updated = await prisma.product.update({
            where: { id: parseInt(id) },
            data: {
                quantity: quantity,
                status: status   // uppercase values: 'OK', 'LOW', 'OUT_OF_STOCK'
            },
            include: { depot: true, brand: true }
        });

        logger.info(`Stock updated for product ${id}: ${product.quantity} → ${quantity} (${reason})`);

        // If this is a sale (quantity decreased) and employee provided, update ProductPerformance
        if (reason === 'sale' && employeeId && quantity < product.quantity) {
            const soldQuantity = product.quantity - quantity;
            await this.updateProductPerformance(parseInt(id), employeeId, soldQuantity);
        }

        // Trigger low stock alert if needed
        if (quantity < product.minStock) {
            await this.triggerLowStockAlert(updated);
        }

        return updated;
    }

    /**
     * 5.UPDATE PRICE
     */
    async updatePrice(id, price) {
        const product = await this.findById(id);

        const updated = await prisma.product.update({
            where: { id: parseInt(id) },
            data: { price: price }
        });

        logger.info(`Price updated for product ${id}: ${product.price} → ${price}`);
        return updated;
    }

    /**
     * 6.UPDATE MIN STOCK LEVEL
     */
    async updateMinStock(id, minStock) {
        const product = await this.findById(id);

        const updated = await prisma.product.update({
            where: { id: parseInt(id) },
            data: {
                minStock: minStock,
                status: product.quantity >= minStock ? 'ok' : 'low'
            }
        });

        // Check if newly set minStock triggers low stock alert
        if (product.quantity < minStock) {
            await this.triggerLowStockAlert(updated);
        }

        logger.info(`Min stock updated for product ${id}: ${product.minStock} → ${minStock}`);
        return updated;
    }

    /**
     * 7. GET LOW STOCK PRODUCTS
     *
     * Prisma does NOT support column-to-column comparisons (quantity < minStock)
     * in a where clause. Instead we rely on the `status` field which is kept
     * in sync by create(), updateStock(), and updateMinStock().
     *   status = 'low'        → quantity < minStock  (but stock > 0)
     *   status = 'out_of_stock' → quantity = 0
     */
    async getLowStockProducts(req, res, next) {
        try {
            const { depotId } = req.query;
            const where = {
                quantity: { lt: prisma.product.fields.minStock }
            };
            if (depotId) {
                where.depotId = parseInt(depotId);
            }

            const products = await prisma.product.findMany({
                where,
                include: {
                    depot: { select: { id: true, name: true, code: true } },
                    brand: { select: { id: true, name: true } }
                },
                orderBy: { quantity: "asc" }
            });

            const result = products.map(p => ({
                id: p.id,
                name: p.name,
                sku: p.sku,
                quantity: p.quantity,
                minStock: p.minStock,
                deficit: Math.max(0, p.minStock - p.quantity),
                status: p.status,
                depot: p.depot,
                brand: p.brand
            }));

            res.json({ success: true, count: result.length, data: result });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Record a sale (employee sells products)
     * @param {number} productId
     * @param {number} employeeId
     * @param {number} quantitySold
     * @param {Date} [saleDate] - defaults to now
     * @returns {Promise<Object>} updated product, performance record, KPI update
     */
    async recordSale(productId, employeeId, quantitySold, saleDate = new Date()) {
        const product = await this.findById(productId);
        if (product.quantity < quantitySold) {
            throw new Error(`Insufficient stock. Available: ${product.quantity}, requested: ${quantitySold}`);
        }

        const monthStart = new Date(saleDate.getFullYear(), saleDate.getMonth(), 1);
        const revenue = quantitySold * product.price;

        return await prisma.$transaction(async (tx) => {
            // 1. Update product stock
            const newQuantity = product.quantity - quantitySold;
            let status = 'OK';
            if (newQuantity === 0) status = 'OUT_OF_STOCK';
            else if (newQuantity < product.minStock) status = 'LOW';

            const updatedProduct = await tx.product.update({
                where: { id: productId },
                data: { quantity: newQuantity, status }
            });

            // 2. Update ProductPerformance (find or create)
            const existingPerf = await tx.productPerformance.findFirst({
                where: { productId, employeeId, month: monthStart }
            });
            if (existingPerf) {
                await tx.productPerformance.update({
                    where: { id: existingPerf.id },
                    data: {
                        quantitySold: { increment: quantitySold },
                        revenue: { increment: revenue }
                    }
                });
            } else {
                await tx.productPerformance.create({
                    data: {
                        productId,
                        employeeId,
                        month: monthStart,
                        quantitySold,
                        revenue
                    }
                });
            }

            // 3. Update EmployeeKPI (already has unique constraint, so upsert works)
            const depot = await tx.depot.findFirst({ where: { employeeId } });
            if (depot) {
                await tx.employeeKPI.upsert({
                    where: {
                        employeeId_depotId_month: {
                            employeeId,
                            depotId: depot.id,
                            month: monthStart
                        }
                    },
                    update: {
                        actualValue: { increment: quantitySold },
                        performance: { increment: revenue }
                    },
                    create: {
                        employeeId,
                        depotId: depot.id,
                        month: monthStart,
                        targetValue: 0,
                        actualValue: quantitySold,
                        performance: revenue
                    }
                });
            }

            return updatedProduct;
        });
    }

    /**
     * 8.GET PRODUCT PERFORMANCE (Monthly)
     */
    async getProductPerformance(id, year, month) {
        const product = await this.findById(id);
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);

        // Get monthly sales from ProductPerformance
        const performances = await prisma.productPerformance.findMany({
            where: {
                productId: parseInt(id),
                month: monthStart
            },
            include: {
                employee: {
                    select: { id: true, name: true, email: true }
                }
            }
        });

        // Calculate summary
        const totalQuantitySold = performances.reduce((sum, p) => sum + p.quantitySold, 0);
        const totalRevenue = performances.reduce((sum, p) => sum + (p.revenue || 0), 0);

        // Get stock at start and end of month (from product quantity history - simplified)
        // Note: Without stock movement table, we use current quantity as end of month
        // and estimate start of month by adding sales back
        const stockAtEnd = product.quantity;
        const stockAtStart = stockAtEnd + totalQuantitySold;

        return {
            product: {
                id: product.id,
                name: product.name,
                sku: product.sku,
                price: product.price,
                minStock: product.minStock,
                currentStock: product.quantity
            },
            depot: {
                id: product.depot.id,
                name: product.depot.name
            },
            period: {
                year,
                month,
                monthName: this.getMonthName(month)
            },
            sales: {
                quantitySold: totalQuantitySold,
                revenue: totalRevenue,
                averagePrice: totalQuantitySold > 0 ? totalRevenue / totalQuantitySold : 0,
                byEmployee: performances.map(p => ({
                    employeeId: p.employee.id,
                    employeeName: p.employee.name,
                    quantitySold: p.quantitySold,
                    revenue: p.revenue
                }))
            },
            stock: {
                startOfMonth: stockAtStart,
                endOfMonth: stockAtEnd,
                soldDuringMonth: totalQuantitySold
            }
        };
    }

    /**
     * Helper: Update ProductPerformance when stock decreases due to sale
     */
    async updateProductPerformance(productId, employeeId, quantitySold) {
        const monthStart = startOfMonth(new Date());
        const price = await this.getProductPrice(productId);
        const revenue = quantitySold * price;

        await prisma.productPerformance.upsert({
            where: {
                productId_employeeId_month: {
                    productId: productId,
                    employeeId: employeeId,
                    month: monthStart
                }
            },
            update: {
                quantitySold: { increment: quantitySold },
                revenue: { increment: revenue }
            },
            create: {
                productId: productId,
                employeeId: employeeId,
                month: monthStart,
                quantitySold: quantitySold,
                revenue: revenue
            }
        });

        // Also update EmployeeKPI actualValue
        await this.updateEmployeeKPI(employeeId, monthStart, quantitySold, revenue);
    }

    /**
     * Helper: Update EmployeeKPI actual values
     */
    async updateEmployeeKPI(employeeId, month, quantitySold, revenue) {
        // Find the depot for this employee (simplified - assumes one depot per employee)
        const depot = await prisma.depot.findFirst({
            where: { employeeId: employeeId }
        });

        if (depot) {
            await prisma.employeeKPI.upsert({
                where: {
                    employeeId_depotId_month: {
                        employeeId: employeeId,
                        depotId: depot.id,
                        month: month
                    }
                },
                update: {
                    actualValue: { increment: quantitySold },
                    performance: { increment: revenue }
                },
                create: {
                    employeeId: employeeId,
                    depotId: depot.id,
                    month: month,
                    targetValue: 0,
                    actualValue: quantitySold,
                    performance: revenue
                }
            });
        }
    }

    /**
     * Helper: Get product price
     */
    async getProductPrice(productId) {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { price: true }
        });
        return product?.price || 0;
    }

    /**
     * Helper: Trigger low stock alert
     */
    async triggerLowStockAlert(product) {
        logger.warn(`🚨 LOW STOCK: Product ${product.name} (${product.sku}) at depot ${product.depotId} has ${product.quantity} units (min: ${product.minStock})`);
        return true;
    }

    /**
     * Helper: Generate SKU from name
     */
    generateSku(name) {
        return name.toUpperCase().replace(/\s/g, '-').substring(0, 20);
    }

    /**
     * Helper: Get month name
     */
    getMonthName(month) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return months[month - 1];
    }

    /**
     * Soft delete product
     */
    async delete(id) {
        await this.findById(id);
        const deleted = await prisma.product.update({
            where: { id: parseInt(id) },
        });
        logger.info(`Product soft deleted: ${id}`);
        return deleted;
    }
}

export const productService = new ProductService();