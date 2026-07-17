import { prisma } from "../config/db.js";
import logger from "../config/logger.js";
import {
  parseImportDate,
  normalizeSex,
  normalizeImportRow,
} from "../utils/importUtils.js";


class DepotService {
  async createDepot(data) {
    try {
      // Validate required fields
      if (!data.name?.trim()) throw new Error("Depot name is required");
      if (!data.provinceName?.trim())
        throw new Error("Province name is required");
      if (!data.districtName?.trim())
        throw new Error("District name is required");

      const result = await prisma.$transaction(async (tx) => {
        // ---------- Handle Province ----------
        let province = await tx.province.findFirst({
          where: { name: data.provinceName.trim() },
        });
        if (!province) {
          province = await tx.province.create({
            data: { name: data.provinceName.trim() },
          });
        }

        // ---------- Handle District ----------
        let district = await tx.district.findFirst({
          where: {
            name: data.districtName.trim(),
            provinceId: province.id,
          },
        });
        if (!district) {
          district = await tx.district.create({
            data: {
              name: data.districtName.trim(),
              provinceId: province.id,
            },
          });
        }

        // ---------- Handle Employee (NO AUTO-CREATION) ----------
        let employeeId = null;
        const rawEmployeeId =
          data.employeeId !== undefined &&
            data.employeeId !== null &&
            data.employeeId !== ""
            ? Number(data.employeeId)
            : null;

        if (rawEmployeeId && !isNaN(rawEmployeeId) && rawEmployeeId > 0) {
          const existingEmployee = await tx.employee.findUnique({
            where: { id: rawEmployeeId },
            select: { id: true },
          });
          if (!existingEmployee) {
            throw new Error(`Employee with ID ${rawEmployeeId} not found`);
          }
          employeeId = rawEmployeeId;
        }

        // ---------- Ensure code uniqueness ----------
        if (data.code) {
          const existing = await tx.depot.findUnique({
            where: { code: data.code },
          });
          if (existing) throw new Error("Depot code already exists");
        }

        if (data.brandId !== undefined && data.brandId !== null && data.brandId !== "") {
          const brandId = Number(data.brandId);

          if (isNaN(brandId)) {
            throw new Error("Invalid brandId");
          }

          const existingBrand = await tx.brand.findUnique({
            where: { id: brandId },
          });

          if (!existingBrand) {
            throw new Error(`Brand with ID ${brandId} not found`);
          }
        }

        // ---------- Create Depot ----------
        const depot = await tx.depot.create({
          data: {
            name: data.name.trim(),
            khmerName: data.khmerName,
            code: data.code || null,
            address: data.address || null,
            phone: data.phone || null,
            houseNumber: data.houseNumber || data.homeNumber || null,
            street: data.street || null,
            village: data.village || null,
            commune: data.commune || null,
            expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
            status: data.status || "active",
            provinceId: province.id,
            districtId: district.id,
            employeeId: employeeId,
            assignedAt: employeeId ? new Date() : null,
            brandId: data.brandId || null,
            note: data.note?.trim() || null,
          },
          include: {
            district: { include: { province: true } },
            employee: true,
          },
        });

        // // ---------- Handle DepotBrands (fixed condition) ----------
        // if (
        //   data.brandIds &&
        //   Array.isArray(data.brandIds) &&
        //   data.brandIds.length > 0
        // ) {
        //   await tx.depotBrand.createMany({
        //     data: data.brandIds.map((brandId) => ({
        //       depotId: depot.id,
        //       brandId: Number(brandId),
        //       assignedDate: new Date(),
        //       status: "active",
        //       provinceId: province.id,
        //     })),
        //     skipDuplicates: true,
        //   });
        // }

        // ---------- Return depot with brands (optional) ----------
        // Fetch the complete depot with its brand relations
        const depotWithBrands = await tx.depot.findUnique({
          where: { id: depot.id },
          include: {
            district: { include: { province: true } },
            employee: true,
            // depotBrands: { include: { brand: true } },
          },
        });

        return depotWithBrands || depot;
      });

      return result;
    } catch (error) {
      console.error("Error creating depot:", error);
      throw error;
    }
  }
  //find depots not yet assign
  async findDepotNotAssigned() {
    return await prisma.depot.count({
      where: { employeeId: null },
    });
  }
  async updateDepot(id, data) {
    try {
      const numericId = Number(id);

      // 1. Check depot exists
      const existingDepot = await prisma.depot.findUnique({
        where: { id: numericId },
        include: { employee: true },
      });
      if (!existingDepot) {
        throw new Error("Depot not found");
      }

      // 2. Check code uniqueness
      if (data.code && data.code !== existingDepot.code) {
        const codeExists = await prisma.depot.findUnique({
          where: { code: data.code },
        });
        if (codeExists) throw new Error("Depot code already exists");
      }

      // 3. Employee handling – NO CREATION
      let employeeId = existingDepot.employeeId; // keep current by default

      // Priority: employeeId (even if employeeName also sent)
      if (data.employeeId !== undefined) {
        if (data.employeeId === null || data.employeeId === "") {
          employeeId = null; // unassign
        } else {
          const empId = Number(data.employeeId);
          if (isNaN(empId) || empId <= 0) {
            throw new Error("Invalid employee ID. Must be a positive number.");
          }
          const employee = await prisma.employee.findUnique({
            where: { id: empId },
          });
          if (!employee) {
            throw new Error(`Employee with ID ${empId} not found.`);
          }
          employeeId = empId;
        }
      }
      // If only employeeName is provided, try to find an existing employee (no creation)
      else if (data.employeeName && data.employeeName.trim()) {
        const foundEmployee = await prisma.employee.findFirst({
          where: {
            OR: [
              {
                englishName: {
                  contains: data.employeeName.trim(),
                  mode: "insensitive",
                },
              },
              {
                khmerName: {
                  contains: data.employeeName.trim(),
                  mode: "insensitive",
                },
              },
            ],
          },
        });
        if (foundEmployee) {
          employeeId = foundEmployee.id;
          logger.warn(
            `Depot ${id}: assigned employee by name "${data.employeeName}" -> ID ${foundEmployee.id}`,
          );
        } else {
          logger.warn(
            `Depot ${id}: employee name "${data.employeeName}" not found, keeping current assignment`,
          );
        }
      }

      // 4. Build update data (only fields that are provided)
      const updateData = {};
      if (data.name !== undefined) updateData.name = data.name;
      if(data.khmerName !== undefined) updateData.khmerName = data.khmerName;
      if (data.code !== undefined) updateData.code = data.code;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.districtId !== undefined)
        updateData.districtId = Number(data.districtId);
      if (data.houseNumber !== undefined)
        updateData.houseNumber = data.houseNumber;
      if (data.street !== undefined) updateData.street = data.street;
      if (data.village !== undefined) updateData.village = data.village;
      if (data.commune !== undefined) updateData.commune = data.commune;
      if (data.expiryDate !== undefined && data.expiryDate !== "") {
        updateData.expiryDate = new Date(data.expiryDate);
      }

      updateData.employeeId = employeeId;
      if (data.assignedAt !== undefined && data.assignedAt !== "") {
        updateData.assignedAt = data.assignedAt
          ? new Date(data.assignedAt)
          : new Date();
      }
      if (employeeId !== existingDepot.employeeId) {
        updateData.assignedAt = new Date();
      }
      if (data.brandId != null && data.brandId !== "") {
        const brandId = Number(data.brandId);
        if (!isNaN(brandId)) {
          updateData.brandId = brandId;
        }
      }
      if (data.note !== undefined) {
        updateData.note = data.note?.trim() || null;
      }


      console.log("brand updated", updateData);


      // 5. Update depot
      const updatedDepot = await prisma.depot.update({
        where: { id: numericId },
        data: updateData,
        include: {
          district: { include: { province: true } },
          employee: true,
        },
      });

      logger.info(`Depot updated: ${updatedDepot.code} - ${updatedDepot.name}`);
      return updatedDepot;
    } catch (error) {
      logger.error(`Failed to update depot: ${id} - ${error.message}`);
      throw error;
    }
  }
  async delete(id) {
    try {
      // Convert string to integer
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        throw new Error("Invalid depot ID: must be a number");
      }

      const existingDepot = await prisma.depot.findUnique({
        where: { id: numericId },
      });
      if (!existingDepot) {
        throw new Error(`Depot with id ${numericId} not found`);
      }
      // await prisma.de.deleteMany({
      //   where: { depotId: numericId },
      // });

      // hard delete
      const deleteDepot = await prisma.depot.delete({
        where: { id: numericId },
      });

      logger.info(`Depot deleted: ${deleteDepot.code} - ${deleteDepot.name}`);
      return deleteDepot;
    } catch (error) {
      logger.error(`Failed to delete depot: ${id} - ${error.message}`);
      throw error;
    }
  }

  async getById(id) {
    try {
      const numericId = Number(id);
      if (isNaN(numericId)) throw new Error("Invalid depot ID");

      // Fetch depot with its direct employee, brands, and staff
      const depot = await prisma.depot.findUnique({
        where: { id: numericId },
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          phone: true,
          address: true,
          createdAt: true,
          expiryDate: true,
          note: true,
          employee: {
            //direct relation (singular)
            select: {
              id: true,
              khmerName: true,
              englishName: true,
              employeeCode: true,
              phone: true,
              email: true,
              position: true,
              images: true,
            },
          },
          staffs: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
            orderBy: { name: "asc" },
          },
          _count: {
            select: { products: true, staffs: true },
          },
          district: {
            select: {
              name: true,
              province: { select: { name: true } },
            },
          },
          brand: {
            select: { id: true, name: true },
          },
        },
      });

      if (!depot) {
        throw new Error(`Depot not found`);
      }

      // Owner is the directly linked employee (could be null)
      const owner = depot.employee
        ? {
          id: depot.employee.id,
          khmerName: depot.employee.khmerName,
          englishName: depot.employee.englishName,
          employeeCode: depot.employee.employeeCode,
          phone: depot.employee.phone,
          email: depot.employee.email,
          position: depot.employee.position,
          images: depot.employee.images,
        }
        : null;

      // Staff from staffs table
      const staffs = (depot.staffs || []).map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
      }));

      // Keep employees as supervisor for backward compatibility
      const employeesFormatted = owner
        ? [
          {
            id: owner.id,
            name: owner.englishName || owner.khmerName,
            position: owner.position || "Sale Supervisor",
            assignmentType: "permanent",
          },
        ]
        : [];

      // Timeline – just the depot creation event (no assignment history)
      const timeline = [
        {
          action: `Depot created`,
          createdAt: depot.createdAt.toISOString().split("T")[0],
        },
      ];

      return {
        id: depot.id,
        header: {
          depotName: depot.name,
          depotCode: depot.code,
          status: depot.status.toUpperCase(),
          generatedAt: new Date().toISOString(),
        },
        overview: {
          phone: depot.phone,
          createdAt: depot.createdAt.toISOString().split("T")[0],
          address: depot.address,
          district: depot.district?.name,
          province: depot.district?.province?.name,
        },
        owner,
        brands: depot.brand
          ? [{ id: depot.brand.id, name: depot.brand.name }]
          : [],
        note: depot.note,
        employees: employeesFormatted,
        staffs,
        counts: {
          products: depot._count.products,
          staffs: depot._count.staffs,
        },
        timeline,
      };
    } catch (error) {
      logger.error(`Failed to get depot by id: ${id} - ${error.message}`);
      throw error;
    }
  }

  /**
   * Get depot counts, optionally filtered by brand(s).
   * @param {Object} filters
   * @param {number} [filters.brandId]
   * @param {number[]} [filters.brandIds]
   */
  async getDepotSummary(filters = {}) {
    const { brandId, brandIds } = filters;
    const now = new Date();
    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(now.getDate() + 30);

    const where = {};
    if (brandId) {
      where.brandId = parseInt(brandId, 10);
    } else if (brandIds?.length) {
      where.brandId = { in: brandIds.map((id) => parseInt(id, 10)) };
    }

    const [total, vacancy, active, expired, expiringSoon] = await Promise.all([
      prisma.depot.count({ where }),
      prisma.depot.count({ where: { ...where, status: "vacancy" } }),
      prisma.depot.count({ where: { ...where, status: "active" } }),
      prisma.depot.count({ where: { ...where, expiryDate: { lt: now } } }),
      prisma.depot.count({
        where: {
          ...where,
          expiryDate: { gte: now, lte: thirtyDaysLater },
        },
      }),
    ]);

    return { total, vacancy, active, expired, expiringSoon };
  }

  /**
   * Get all depot counts (global).
   */
  async getDepotCounts() {
    return this.getDepotSummary();
  }


  async getDepotsGroupByProvince(filters) {
    try {
      // Build where clause
      const where = {};
      if (filters.status && filters.status !== "all") {
        where.status = filters.status;
      }

      // Add date filters
      if (filters.fromDate || filters.toDate) {
        where.createdAt = {};
        if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
        if (filters.toDate) where.createdAt.lte = new Date(filters.toDate);
      }

      // Add search filter (code, name, or owner name)
      if (filters.search) {
        where.OR = [
          { code: { contains: filters.search, mode: "insensitive" } },
          { name: { contains: filters.search, mode: "insensitive" } },
          {
            assignments: {
              some: {
                status: "active",
                employee: {
                  khmerName: { contains: filters.search, mode: "insensitive" },
                },
              },
            },
          },
          {
            assignments: {
              some: {
                status: "active",
                employee: {
                  englishName: {
                    contains: filters.search,
                    mode: "insensitive",
                  },
                },
              },
            },
          },
        ];
      }

      // Group by province and count depots
      const result = await prisma.province.groupBy({
        by: ["id", "name"],
        where,
        _count: {
          id: true,
        },
        orderBy: {
          _count: { id: "desc" },
        },
      });

      // Map to the desired format
      const groupedData = result.map((item) => ({
        id: item.id,
        province: item.name,
        depotCount: item._count.id,
      }));

      return groupedData;
    } catch (error) {
      logger.error("Error in getDepotsGroupByProvince:", error);
      throw error;
    }
  }
  /**
   * Get depots for reporting with optional date range and grouping by province
   * @param {Object} filters - { fromDate, toDate, groupBy }
   * @returns {Promise<Object>}
   */
  async getDepotReport(filters = {}) {
    const { fromDate, toDate, groupBy } = filters;
    const where = {};

    if (fromDate) {
      where.createdAt = { gte: new Date(fromDate) };
    }
    if (toDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(toDate) };
    }

    const depots = await prisma.depot.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            englishName: true,
            khmerName: true,
            phone: true,
            images: true,
          },
        },
        district: { include: { province: true } },
        // depotBrands: { include: { brand: true } }, //critical include
      },
      orderBy: { createdAt: "desc" },
    });

    const transformDepot = (d) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      status: d.status,
      phone: d.phone,
      address: d.address,
      fullAddress: `${d.houseNumber || ""} ${d.street || ""} ${d.village || ""} ${d.commune || ""}, ${d.district?.name || ""}, ${d.district?.province?.name || ""}`,
      district: d.district?.name,
      city: d.district?.province?.name,
      createdAt: d.createdAt,
      expiryDate: d.expiryDate,
      owner: d.employee
        ? {
          id: d.employee.id,
          name: d.employee.englishName || d.employee.khmerName,
          phone: d.employee.phone,
          image: d.employee.images,
        }
        : null,
      brands: (d.depotBrands || []).map((db) => db.brand?.name).filter(Boolean), // ✅ safe fallback
    });

    const transformed = depots.map(transformDepot);

    if (groupBy === "province") {
      const grouped = transformed.reduce((acc, depot) => {
        const province = depot.city || "Unknown";
        if (!acc[province]) acc[province] = [];
        acc[province].push(depot);
        return acc;
      }, {});
      const summary = Object.keys(grouped).map((province) => ({
        province,
        total: grouped[province].length,
        active: grouped[province].filter((d) => d.status === "active").length,
        expired: grouped[province].filter(
          (d) => d.expiryDate && new Date(d.expiryDate) < new Date(),
        ).length,
      }));
      return { grouped, summary };
    } else {
      const summary = {
        total: transformed.length,
        active: transformed.filter((d) => d.status === "active").length,
        expired: transformed.filter(
          (d) => d.expiryDate && new Date(d.expiryDate) < new Date(),
        ).length,
      };
      return { data: transformed, summary };
    }
  }

  /**
   * Get all depots with filtering, pagination, sorting, group by province or district, and relation inclusion
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.pageSize - Items per page (default: 20)
   * @param {string} options.sortBy - Field to sort by (default: 'createdAt')
   * @param {string} options.sortOrder - 'asc' or 'desc' (default: 'desc')
   * @param {boolean} options.includeAddress - Include houseNumber, street, village, commune (default: false)
   * @param {Object} options.filters - Filter conditions
   * @param {string} options.filters.status - 'active', 'expired', 'inactive'
   * @param {string} options.filters.city - Province name
   * @param {string} options.filters.district - District name
   * @param {string} options.filters.company - Company name (partial match)
   * @param {string} options.filters.search - Search in code, name, owner name
   * @param {Date|string} options.filters.fromDate - Created at start date
   * @param {Date|string} options.filters.toDate - Created at end date
   * @returns {Promise<Object>} { data: [], pagination: {}, filtersApplied: {} }
   */
  async getAllDepot({
    page = 1,
    pageSize = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
    groupBy = null,
    includeAddress = false,
    filters = {},
  }) {
    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 20));
    const skip = (safePage - 1) * safePageSize;
    const orderBy = sortBy === "id"
      ? { id: sortOrder }
      : [{ [sortBy]: sortOrder }, { id: sortOrder }];

    const parseList = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value.flatMap(parseList).filter(Boolean);
      return String(value)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    };

    const where = {};
    const and = [];

    if (groupBy === "province") {
      const grouped = await this.getDepotsGroupByProvince(filters);
      return {
        grouped: true,
        data: grouped,
        filtersApplied: filters,
      };
    }

    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
      if (filters.toDate) where.createdAt.lte = new Date(filters.toDate);
    }

    const provinces = parseList(
      filters.province || filters.city || filters.provinceName,
    );
    const districts = parseList(filters.district || filters.districtName);
    if (provinces.length || districts.length) {
      const districtFilter = {};
      if (districts.length) {
        districtFilter.OR = districts.map((name) => ({
          name: { equals: name, mode: "insensitive" },
        }));
      }
      if (provinces.length) {
        districtFilter.province = {
          OR: provinces.map((name) => ({
            name: { equals: name, mode: "insensitive" },
          })),
        };
      }
      and.push({ district: districtFilter });
    }

    const brandIds = parseList(filters.brandId || filters.brandIds)
      .map(Number)
      .filter((id) => !Number.isNaN(id));
    const brandNames = parseList(filters.brand || filters.brandName);
    if (brandIds.length) {
      and.push({ brandId: { in: brandIds } });
    } else if (brandNames.length) {
      and.push({
        brand: {
          OR: brandNames.map((name) => ({
            name: { equals: name, mode: "insensitive" },
          })),
        },
      });
    }

    const owners = parseList(filters.owner || filters.ownerName);
    if (owners.length) {
      and.push({
        employee: {
          OR: owners.flatMap((name) => [
            { khmerName: { contains: name, mode: "insensitive" } },
            { englishName: { contains: name, mode: "insensitive" } },
          ]),
        },
      });
    }

    const statuses = parseList(filters.status);
    if (statuses.length) {
      const now = new Date();
      const in30 = new Date(now);
      in30.setDate(now.getDate() + 30);
      const statusOr = [];
      for (const status of statuses) {
        if (status === "expired") {
          statusOr.push({ expiryDate: { lt: now } });
        } else if (status === "expiring_soon") {
          statusOr.push({
            AND: [
              { expiryDate: { gte: now, lte: in30 } },
              { status: { not: "vacancy" } },
            ],
          });
        } else if (status !== "all") {
          statusOr.push({ status });
        }
      }
      if (statusOr.length) and.push({ OR: statusOr });
    }

    if (filters.search?.trim()) {
      const term = filters.search.trim();
      and.push({
        OR: [
          { code: { contains: term, mode: "insensitive" } },
          { name: { contains: term, mode: "insensitive" } },
          { khmerName: { contains: term, mode: "insensitive" } },
          { address: { contains: term, mode: "insensitive" } },
          {
            district: {
              OR: [
                { name: { contains: term, mode: "insensitive" } },
                {
                  province: {
                    name: { contains: term, mode: "insensitive" },
                  },
                },
              ],
            },
          },
          {
            employee: {
              OR: [
                { khmerName: { contains: term, mode: "insensitive" } },
                { englishName: { contains: term, mode: "insensitive" } },
              ],
            },
          },
          {
            brand: {
              name: { contains: term, mode: "insensitive" },
            },
          },
        ],
      });
    }

    if (and.length) where.AND = and;

    // Determine which fields to select
    const selectFields = {
      id: true,
      code: true,
      name: true,
      khmerName: true,
      phone: true,
      status: true,
      createdAt: true,
      expiryDate: true,
      houseNumber: includeAddress,
      street: includeAddress,
      village: includeAddress,
      commune: includeAddress,
      address: true,
      note: true,
      district: {
        select: {
          id: true,
          name: true,
          province: { select: { id: true, name: true } },
        },
      },
      employee: {
        select: {
          id: true,
          khmerName: true,
          englishName: true,
          employeeCode: true,
          phone: true,
          email: true,
          position: true,
          images: true,
        },
      },
      brand: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: { staffs: true },
      },
    };

    const [depots, totalCount] = await Promise.all([
      prisma.depot.findMany({
        where,
        skip,
        take: safePageSize,
        orderBy,
        select: selectFields,
      }),
      prisma.depot.count({ where }),
    ]);

    // Format the response
    const formattedData = depots.map((depot) => {
      const owner = depot.employee;
      const result = {
        id: depot.id,
        code: depot.code,
        name: depot.name,
        khmerName: depot.khmerName,
        phone: depot.phone,
        status: depot.status,
        expiredDate: depot.expiryDate,
        createdAt: depot.createdAt,
        district: depot.district?.name,
        city: depot.district?.province?.name,
        address: depot.address,
        note: depot.note,
        owner: owner
          ? {
            id: owner.id,
            name: owner.khmerName || owner.englishName,
            code: owner.employeeCode,
            phone: owner.phone,
            email: owner.email,
            position: owner.position,
            image: owner.images,
          }
          : null,
        brand: depot.brand ? { id: depot.brand.id, name: depot.brand.name } : null,
        staffCount: depot._count?.staffs ?? 0,
      };
      if (includeAddress) {
        result.address = {
          houseNumber: depot.houseNumber,
          street: depot.street,
          village: depot.village,
          commune: depot.commune,
        };
      }
      return result;
    });

    return {
      data: formattedData,
      pagination: {
        page: safePage,
        pageSize: safePageSize,
        total: totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / safePageSize)),
        hasNext: safePage * safePageSize < totalCount,
        hasPrev: safePage > 1,
      },
      filtersApplied: filters,
    };
  }




  // ─── Validate a single row ──────────────────────────────
  _validateRow(record, rowNumber) {
    const errors = [];
    const warnings = [];

    // ── Auto‑fill missing or empty required fields ──
    if (!record.name?.trim()) {
      record.name = "Unnamed Depot";
      warnings.push("Depot name missing – defaulted to 'Unnamed Depot'");
    } else if (record.name.trim().toLowerCase() === "vacancy") {
      warnings.push("Depot name is 'Vacancy' – inserted as‑is");
    }

    if (!record.provinceName?.trim()) {
      record.provinceName = "Phnom Penh"; // or your default province
      warnings.push("Province missing – defaulted to 'Phnom Penh'");
    } else if (record.provinceName.trim().toLowerCase() === "vacancy") {
      warnings.push("Province is 'Vacancy' – will be created/used as‑is");
    }

    if (!record.districtName?.trim()) {
      record.districtName = "Daun Penh"; // your default district
      warnings.push("District missing – defaulted to 'Daun Penh'");
    } else if (record.districtName.trim().toLowerCase() === "vacancy") {
      warnings.push("District is 'Vacancy' – will be created/used as‑is");
    }

    // ── Status (optional) ──
    const validStatuses = ["active", "inactive"];
    if (record.status && !validStatuses.includes(record.status.toLowerCase())) {
      errors.push(`status must be one of: ${validStatuses.join(", ")}`);
    } else if (!record.status) {
      record.status = "active"; // default
      warnings.push("Status missing – defaulted to 'active'");
    }

    // ── Depot Number (optional) ──
    if (record.depotNumber && typeof record.depotNumber !== "string") {
      errors.push("Depot Number must be a string");
    }

    // ── DOB (optional) ──
    if (record.dob && record.dob.toString().trim()) {
      try {
        record.dobParsed = parseImportDate(record.dob, rowNumber);
      } catch (err) {
        errors.push(`DOB: ${err.message}`);
      }
    } else {
      record.dobParsed = null;
    }

    // ── Expiry Date (optional) ──
    if (record.expiryDate && record.expiryDate.toString().trim()) {
      try {
        record.expiryDateParsed = parseImportDate(record.expiryDate, rowNumber);
      } catch (err) {
        errors.push(`ExpiryDate: ${err.message}`);
      }
    } else {
      record.expiryDateParsed = null;
    }

    // ── Sex (optional) ──
    if (record.sex) {
      const normalised = normalizeSex(record.sex);
      if (!normalised) {
        errors.push(`Sex must be one of: male, female, M, F, other`);
      } else {
        record.sex = normalised;
      }
    } else {
      record.sex = null;
    }

    // ── Throw if any errors ──
    if (errors.length > 0) {
      throw new Error(`Row ${rowNumber}: ${errors.join("; ")}`);
    }

    // ── Store warnings on the record for UI ──
    record._warnings = warnings;
  }

  // ─── Employee cache key ──────────────────────────────────
  _employeeCacheKey(record) {
    const name = (record.employeeName || "").trim().toLowerCase();
    const email = (record.employeeEmail || "").trim().toLowerCase();
    return `${name}|${email}`;
  }

  // ─── Warm reference caches (provinces, districts, employees, brands) ──────
  async _warmBulkImportCaches(tx, records) {
    const cache = {
      provinces: new Map(),
      districts: new Map(),
      employees: new Map(),
      brands: new Map(),
    };

    // ─── 1. Ensure all provinces exist ──────────────────────
    const provinceNames = [...new Set(records.map(r => r.provinceName?.trim()).filter(Boolean))];
    const existingProvinces = await tx.province.findMany({
      where: { name: { in: provinceNames } },
    });
    for (const p of existingProvinces) {
      cache.provinces.set(p.name.trim().toLowerCase(), p);
    }
    const missingProvinces = provinceNames.filter(name => !cache.provinces.has(name.toLowerCase()));
    if (missingProvinces.length) {
      await tx.province.createMany({
        data: missingProvinces.map(name => ({ name })),
        skipDuplicates: true,
      });
      const created = await tx.province.findMany({ where: { name: { in: missingProvinces } } });
      for (const p of created) cache.provinces.set(p.name.trim().toLowerCase(), p);
    }

    // ─── 2. Ensure all districts exist ──────────────────────
    const provinceIdMap = new Map();
    for (const [key, prov] of cache.provinces) provinceIdMap.set(key, prov.id);

    const districtPairs = [];
    for (const record of records) {
      const pName = record.provinceName?.trim();
      const dName = record.districtName?.trim();
      if (!pName || !dName) continue;
      const provId = provinceIdMap.get(pName.toLowerCase());
      if (!provId) continue;
      districtPairs.push({ provinceId: provId, name: dName });
    }

    // Deduplicate district pairs
    const uniquePairs = [];
    const seen = new Set();
    for (const dp of districtPairs) {
      const key = `${dp.provinceId}:${dp.name.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePairs.push(dp);
      }
    }

    const existingDistricts = await tx.district.findMany({
      where: { OR: uniquePairs.map(dp => ({ provinceId: dp.provinceId, name: dp.name })) },
    });
    for (const d of existingDistricts) {
      cache.districts.set(`${d.provinceId}:${d.name.trim().toLowerCase()}`, d);
    }

    const missingDistricts = uniquePairs.filter(dp => {
      const key = `${dp.provinceId}:${dp.name.toLowerCase()}`;
      return !cache.districts.has(key);
    });
    if (missingDistricts.length) {
      await tx.district.createMany({
        data: missingDistricts.map(dp => ({ provinceId: dp.provinceId, name: dp.name })),
        skipDuplicates: true,
      });
      const created = await tx.district.findMany({
        where: { OR: missingDistricts.map(dp => ({ provinceId: dp.provinceId, name: dp.name })) },
      });
      for (const d of created) {
        cache.districts.set(`${d.provinceId}:${d.name.trim().toLowerCase()}`, d);
      }
    }

    // ─── 3. Employees ─────────────────────────────────────────
    const employeeNames = [...new Set(records.map(r => r.employeeName?.trim()).filter(Boolean))];
    const employeeEmails = [...new Set(records.map(r => r.employeeEmail?.trim()).filter(Boolean))];
    const employeeOr = [];
    if (employeeNames.length) employeeOr.push({ englishName: { in: employeeNames, mode: "insensitive" } });
    if (employeeEmails.length) employeeOr.push({ email: { in: employeeEmails } });
    if (employeeOr.length) {
      const existingEmployees = await tx.employee.findMany({ where: { OR: employeeOr } });
      for (const emp of existingEmployees) {
        const key = `${(emp.englishName || "").trim().toLowerCase()}|${(emp.email || "").trim().toLowerCase()}`;
        cache.employees.set(key, emp);
        cache.employees.set(`${(emp.englishName || "").trim().toLowerCase()}|`, emp);
      }
    }
    const employeesToCreate = [];
    const pendingEmployeeKeys = new Set();
    for (const record of records) {
      const key = this._employeeCacheKey(record);
      if (!key || cache.employees.has(key) || pendingEmployeeKeys.has(key)) continue;
      pendingEmployeeKeys.add(key);
      employeesToCreate.push({
        englishName: record.employeeName.trim(),
        khmerName: record.employeeKhmerName?.trim() || record.employeeName.trim(),
        email: record.employeeEmail?.trim() || null,
        phone: record.employeePhone?.trim() || null,
        position: "Owner",
      });
    }
    if (employeesToCreate.length) {
      const createdEmployees = await tx.employee.createManyAndReturn({ data: employeesToCreate });
      for (const emp of createdEmployees) {
        const key = `${(emp.englishName || "").trim().toLowerCase()}|${(emp.email || "").trim().toLowerCase()}`;
        cache.employees.set(key, emp);
      }
    }

    // ─── 4. Brands ────────────────────────────────────────────
    const brandCodes = [...new Set(records.map(r => r.brandCode?.trim()).filter(Boolean))];
    const brandNames = [...new Set(records.map(r => r.brandName?.trim()).filter(Boolean))];
    const brandWhere = [];
    if (brandCodes.length) brandWhere.push({ code: { in: brandCodes, mode: "insensitive" } });
    if (brandNames.length) brandWhere.push({ name: { in: brandNames, mode: "insensitive" } });
    if (brandWhere.length) {
      const brands = await tx.brand.findMany({ where: { OR: brandWhere } });
      for (const b of brands) {
        if (b.code) cache.brands.set(b.code.toLowerCase(), b);
        if (b.name) cache.brands.set(b.name.toLowerCase(), b);
      }
    }

    return cache;
  }

  // ─── Resolve a single bulk row (returns depotData) ──────────
  _resolveBulkRow(record, cache, rowNumber) {
    // Normalize the record first (cleans placeholders, aliases)
    const normalized = normalizeImportRow(record);
    // Validate and auto‑fill missing fields (adds warnings)
    this._validateRow(normalized, rowNumber);

    // ── Resolve province ──
    const province = cache.provinces.get(normalized.provinceName.trim().toLowerCase());
    if (!province) {
      // This should never happen because we created it in _warmBulkImportCaches
      throw new Error(`Province "${normalized.provinceName}" not found`);
    }

    // ── Resolve district ──
    const districtKey = `${province.id}:${normalized.districtName.trim().toLowerCase()}`;
    const district = cache.districts.get(districtKey);
    if (!district) {
      throw new Error(`District "${normalized.districtName}" not found for province "${normalized.provinceName}"`);
    }

    // ── Resolve employee ──
    const empKey = this._employeeCacheKey(normalized);
    const employee = empKey ? cache.employees.get(empKey) : null;

    // ── Resolve brand ──
    let brandId = null;
    const brandCode = normalized.brandCode?.trim();
    const brandName = normalized.brandName?.trim();
    if (brandCode) {
      const brand = cache.brands.get(brandCode.toLowerCase());
      if (!brand) throw new Error(`Brand code "${brandCode}" not found`);
      brandId = brand.id;
    } else if (brandName) {
      const brand = cache.brands.get(brandName.toLowerCase());
      if (!brand) throw new Error(`Brand name "${brandName}" not found`);
      brandId = brand.id;
    }

    // ── Build depot data ──
    const depotData = {
      name: normalized.name.trim(),
      khmerName: normalized.khmerName?.trim() || null,
      code: normalized.code?.trim() || null,
      address: normalized.address?.trim() || null,
      phone: normalized.phone?.trim() || null,
      status: normalized.status?.trim().toLowerCase() || "active",
      provinceId: province.id,
      districtId: district.id,
      employeeId: employee?.id ?? null,
      assignedAt: employee?.id ? new Date() : null,
      brandId: brandId,
      expiryDate: normalized.expiryDateParsed || null,
      dateOfBirth: normalized.dobParsed || null,
      sex: normalized.sex || null,
      DepotIdNumber: normalized.depotNumber?.trim() || null,
      note: normalized.note?.trim() || null,
    };


    return { depotData };
  }

  // ─── Main bulk import (UPSERT per row) ──────────────────
  async bulkCreateDepots(records) {
    const results = [];
    const errors = [];
    const BATCH_SIZE = 200; // increased from 150
    const PARALLEL_LIMIT = 20; // limit parallel upserts to avoid connection pool exhaustion

    const depotSelect = {
      id: true,
      name: true,
      code: true,
      provinceId: true,
      districtId: true,
      status: true,
      employeeId: true,
      brandId: true,
      expiryDate: true,
      dateOfBirth: true,
      sex: true,
      DepotIdNumber: true,
    };

    // ── Normalize & validate ──
    const candidates = [];
    for (const [index, rawRecord] of records.entries()) {
      const rowNumber = index + 1;
      try {
        const normalized = normalizeImportRow(rawRecord);
        this._validateRow(normalized, rowNumber);
        candidates.push({ rowNumber, record: normalized });
      } catch (err) {
        errors.push({ row: rowNumber, data: rawRecord, error: err.message });
      }
    }

    if (candidates.length === 0) {
      return { results, errors };
    }

    const startedAt = Date.now();

    // ── Process in batches ──
    for (let batchStart = 0; batchStart < candidates.length; batchStart += BATCH_SIZE) {
      const batchCandidates = candidates.slice(batchStart, batchStart + BATCH_SIZE);

      await prisma.$transaction(
          async (tx) => {
            const cache = await this._warmBulkImportCaches(tx, batchCandidates.map(c => c.record));

            // ── Resolve all rows in parallel ──
            const resolved = await Promise.all(
                batchCandidates.map(async ({ rowNumber, record }) => {
                  try {
                    const { depotData } = this._resolveBulkRow(record, cache, rowNumber);
                    return { rowNumber, depotData, success: true };
                  } catch (err) {
                    return { rowNumber, error: err.message, success: false };
                  }
                })
            );

            // Filter out failed resolves (they are added to errors)
            const toProcess = resolved.filter(r => r.success);
            const failedResolves = resolved.filter(r => !r.success);
            for (const fail of failedResolves) {
              errors.push({ row: fail.rowNumber, data: null, error: fail.error });
            }

            // ── Prepare upsert operations ──
            const upsertPromises = toProcess.map(async ({ rowNumber, depotData }) => {
              // Build where clause for uniqueness
              let where = {};
              if (depotData.code) {
                where.code = depotData.code;
              } else if (depotData.DepotIdNumber) {
                where.DepotIdNumber = depotData.DepotIdNumber;
              } else {
                where = {};
              }

              // Check existence (for action tracking)
              let existing = null;
              if (where.code) {
                existing = await tx.depot.findUnique({ where: { code: where.code }, select: { id: true } });
              } else if (where.DepotIdNumber) {
                existing = await tx.depot.findUnique({ where: { DepotIdNumber: where.DepotIdNumber }, select: { id: true } });
              }

              const upsertResult = await tx.depot.upsert({
                where: existing ? { id: existing.id } : where,
                update: depotData,
                create: depotData,
                select: depotSelect,
              });

              return {
                row: rowNumber,
                depot: upsertResult,
                action: existing ? "updated" : "created",
              };
            });

            // ── Execute upserts in parallel (with limit) ──
            const resultsChunk = [];
            for (let i = 0; i < upsertPromises.length; i += PARALLEL_LIMIT) {
              const chunk = upsertPromises.slice(i, i + PARALLEL_LIMIT);
              const chunkResults = await Promise.all(chunk);
              resultsChunk.push(...chunkResults);
            }

            // Add to main results
            results.push(...resultsChunk);
          },
          { timeout: 300000, maxWait: 30000 }
      );
    }

    const createdCount = results.filter(r => r.action === "created").length;
    const updatedCount = results.filter(r => r.action === "updated").length;
    logger.info(
        `Bulk depot import: ${createdCount} created, ${updatedCount} updated, ${errors.length} failed in ${Date.now() - startedAt}ms`
    );

    return {
      results: results.map(({ row, depot, action }) => ({ row, depot, action })),
      errors,
    };
  }

  // export block function

  async buildReportData(filters) {
    const {fromDate, toDate, status} = filters;

    const where = {};
    if (fromDate) where.createdAt = {gte: new Date(fromDate)};
    if (toDate) where.createdAt = {lte: new Date(toDate)};
    if (status) where.status = status;

    const depots = await prisma.depot.findMany({
      where,
      include: {
        province: true,
        district: true,
        brand: true,
      },
      orderBy: {createdAt: 'desc'},
    });

    const mapped = depots.map((d) => ({
      code: d.code || '—',
      name: d.name,
      provinceName: d.province?.name || '—',
      districtName: d.district?.name || '—',
      status: d.status,
      expiryDate: d.expiryDate ? new Date(d.expiryDate).toLocaleDateString('en-GB') : '—',
    }));

    const total = mapped.length;
    const active = mapped.filter((d) => d.status === 'active').length;
    const expiringSoon = mapped.filter((d) => {
      if (!d.expiryDate || d.expiryDate === '—') return false;
      const diff = (new Date(d.expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
      return diff > 0 && diff <= 30;
    }).length;

    return {
      generatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      totalDepots: total,
      activeDepots: active,
      expiringSoon,
      depots: mapped,
      companyLogo: process.env.COMPANY_LOGO_URL || '',
    };
  }



}

export default new DepotService();
