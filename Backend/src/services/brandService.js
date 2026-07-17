import { prisma } from "../config/db.js";
import logger from "../config/logger.js";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

class BrandService {
  async getAll(filters = {}) {
    const { search, status } = filters;
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status) {
      where.status = status;
    }
    const brands = await prisma.brand.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return brands;
  }
  async getDepotsByBrand(brandId) {
    try {
      const parsedId = parseInt(brandId);

      if (isNaN(parsedId)) {
        throw  new Error(`Brand with id "${brandId}" not found.`);
      }
      const depots = await prisma.depot.findMany({
        where: {
          brandId: parsedId,
          status: 'active',
        },
        include: {
          district: { select: { name: true } },
          province: { select: { name: true } },
          brand: { select: { name: true } },
        },
        orderBy: { name: 'asc' },
      });

      logger.info(`Depot ${depots.length} depots found.`);

      // Transform to frontend-friendly format
      return depots.map(depot => ({
        id: depot.id,
        name: depot.name,
        code: depot.code,
        district: depot.district?.name ?? '',
        province: depot.province?.name ?? '',
      }));
    }
    catch (error) {
      logger.error(error);
      throw error;

    }
  }

  async getById(id) {
    const brandId = parseInt(id);
    if (isNaN(brandId)) throw new Error("Brand id must be a number");
    
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
    });
    
    if (!brand) throw new Error("Brand not found");
    return brand;
  }

  async create(data) {
    const { name, code, description, status } = data;
    if (!name?.trim()) throw new Error("Brand name is required");
    
    if (code) {
      const existing = await prisma.brand.findUnique({
        where: { code: code.trim() },
      });
      if (existing) throw new Error("Brand code already exists");
    }

    const brand = await prisma.brand.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        description: description?.trim() || null,
        status: status || "active",
      },
    });

    logger.info(`Brand created: ${brand.name}`);
    return brand;
  }

  //update
  async update(id, data) {
    const brandId = parseInt(id);
    if (isNaN(brandId)) throw new Error("Brand id must be a number");

    const existing = await prisma.brand.findUnique({
      where: { id: brandId },
    });

    if (!existing) throw new Error("Brand not found");

    const updateData = {};

    if (data.name !== undefined) updateData.name = data.name.trim();

    if (data.description !== undefined)
      updateData.description = data.description?.trim() || null;

    if (data.status !== undefined) updateData.status = data.status;

    if (data.code !== undefined) {
      if (data.code && data.code !== existing.code) {
        const codeExists = await prisma.brand.findUnique({
          where: { code: data.code.trim() },
        });

        if (codeExists) throw new Error("Brand code already exists");

        updateData.code = data.code.trim();
      } else if (data.code === null) {
        updateData.code = null;
      }
    }

    const brand = await prisma.brand.update({
      where: { id: brandId },
      data: updateData,
    });

    return brand;
  }
  // get depots count in brand
  async getBrandDepotCountById(id) {
    const brand = await prisma.brand.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            depots: true,
          },
        },
      },
    });

    if (!brand) {
      throw new Error("Brand not found");
    }

    return {
      brand_id: brand.id,
      brand_name: brand.name,
      total_depots: brand._count.depots,
    };
  }

  /**
   * Brand executive summary: depot ops, product inventory, and sales snapshot.
   */
  async getSummary(id) {
    const brandId = parseInt(id, 10);
    if (isNaN(brandId)) throw new Error("Brand id must be a number");

    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) throw new Error("Brand not found");

    const now = new Date();
    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(now.getDate() + 30);
    const depotWhere = { brandId };
    const productWhere = { brandId };

    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthEnd = endOfMonth(subMonths(now, 1));

    const [
      depotTotal,
      depotActive,
      depotVacancy,
      depotExpired,
      depotExpiringSoon,
      productTotal,
      productLowStock,
      productOutOfStock,
      currentSales,
      previousSales,
    ] = await Promise.all([
      prisma.depot.count({ where: depotWhere }),
      prisma.depot.count({ where: { ...depotWhere, status: "active" } }),
      prisma.depot.count({ where: { ...depotWhere, status: "vacancy" } }),
      prisma.depot.count({
        where: { ...depotWhere, expiryDate: { lt: now } },
      }),
      prisma.depot.count({
        where: {
          ...depotWhere,
          expiryDate: { gte: now, lte: thirtyDaysLater },
        },
      }),
      prisma.product.count({ where: productWhere }),
      prisma.product.count({
        where: { ...productWhere, status: "LOW" },
      }),
      prisma.product.count({
        where: { ...productWhere, status: "OUT_OF_STOCK" },
      }),
      prisma.productPerformance.aggregate({
        where: {
          product: { brandId },
          month: { gte: monthStart, lte: monthEnd },
        },
        _sum: { quantitySold: true, revenue: true },
      }),
      prisma.productPerformance.aggregate({
        where: {
          product: { brandId },
          month: { gte: prevMonthStart, lte: prevMonthEnd },
        },
        _sum: { quantitySold: true, revenue: true },
      }),
    ]);

    const currentRevenue = Number(currentSales._sum.revenue ?? 0);
    const previousRevenue = Number(previousSales._sum.revenue ?? 0);
    let growthPercent = 0;
    if (previousRevenue > 0) {
      growthPercent = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
    } else if (currentRevenue > 0) {
      growthPercent = 100;
    }

    const activeDepots = depotActive;
    const coveragePercent =
      depotTotal > 0 ? Math.round((activeDepots / depotTotal) * 100) : 0;

    return {
      brandId: brand.id,
      brandName: brand.name,
      depots: {
        total: depotTotal,
        active: depotActive,
        vacancy: depotVacancy,
        expiringSoon: depotExpiringSoon,
        expired: depotExpired,
      },
      products: {
        total: productTotal,
        lowStock: productLowStock,
        outOfStock: productOutOfStock,
      },
      sales: {
        revenue: currentRevenue,
        unitsSold: currentSales._sum.quantitySold ?? 0,
        growthPercent: parseFloat(growthPercent.toFixed(1)),
      },
      coveragePercent,
    };
  }

  async getProductsByBrand(brandId, { page = 1, limit = 50 } = {}) {
    const id = parseInt(brandId, 10);
    if (isNaN(id)) throw new Error("Brand id must be a number");

    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new Error("Brand not found");

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: { brandId: id },
        skip,
        take: limit,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          sku: true,
          quantity: true,
          minStock: true,
          status: true,
          depot: { select: { id: true, name: true } },
        },
      }),
      prisma.product.count({ where: { brandId: id } }),
    ]);

    return {
      data: products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        quantity: p.quantity,
        minStock: p.minStock,
        status: p.status,
        depotName: p.depot?.name ?? null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  //delete brand by id

  async delete(id) {
    const brandId = parseInt(id);
    if (isNaN(brandId)) throw new Error("Brand id must be a number");
    //check if brand is used

    // const depotBrandsCount = await prisma.depotBrand.count({
    //   where: { brandId },
    // });
    // const productsCount = await prisma.product.count({ where: { brandId } });

    await prisma.brand.delete({ where: { id: brandId } });
    logger.info("Brand deleted successfully.");
    return { id: brandId };
  }
}

export default new BrandService();
