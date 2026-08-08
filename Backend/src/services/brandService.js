import { prisma } from "../config/db.js";
import logger from "../config/logger.js";

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
  async getDepotsByBrand(brandId, options = {}) {
    try {
      const parsedId = parseInt(brandId, 10);
      if (isNaN(parsedId)) {
        throw new Error(`Brand with id "${brandId}" not found.`);
      }

      const page = Math.max(1, Number(options.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(options.pageSize) || 10));
      const skip = (page - 1) * pageSize;
      const search = options.search?.trim() || "";
      const status = options.status?.trim() || "";

      const where = { brandId: parsedId };
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { code: { contains: search, mode: "insensitive" } },
          { khmerName: { contains: search, mode: "insensitive" } },
        ];
      }

      const [total, depots] = await Promise.all([
        prisma.depot.count({ where }),
        prisma.depot.findMany({
          where,
          include: {
            district: { select: { name: true } },
            province: { select: { name: true } },
            brand: { select: { name: true } },
          },
          orderBy: [{ status: "asc" }, { name: "asc" }],
          skip,
          take: pageSize,
        }),
      ]);

      const totalPages = Math.max(1, Math.ceil(total / pageSize));

      logger.info(
        `Brand ${parsedId}: ${depots.length}/${total} depots (page ${page})`,
      );

      return {
        data: depots.map((depot) => ({
          id: depot.id,
          name: depot.name,
          code: depot.code,
          district: depot.district?.name ?? "",
          province: depot.province?.name ?? "",
          status: depot.status,
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
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
    const { name, code, description, status, logoUrl } = data;
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
        logoUrl: logoUrl?.trim() || null,
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

    if (data.logoUrl !== undefined) {
      updateData.logoUrl = data.logoUrl?.trim() || null;
    }

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
   * Brand executive summary: depot ops snapshot.
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

    const [
      depotTotal,
      depotActive,
      depotVacancy,
      depotExpired,
      depotExpiringSoon,
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
    ]);

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
      coveragePercent,
    };
  }

  //delete brand by id

  async delete(id) {
    const brandId = parseInt(id);
    if (isNaN(brandId)) throw new Error("Brand id must be a number");

    await prisma.brand.delete({ where: { id: brandId } });
    logger.info("Brand deleted successfully.");
    return { id: brandId };
  }
}

export default new BrandService();
