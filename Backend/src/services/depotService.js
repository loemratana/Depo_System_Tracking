import { prisma } from "../config/db.js";
import logger from "../config/logger.js";

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

      // Fetch depot with its direct employee and brands
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
          district: {
            select: {
              name: true,
              province: { select: { name: true } },
            },
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

      // Since there's no assignment history, employees list only contains the current owner
      const employeesFormatted = owner
        ? [
            {
              id: owner.id,
              name: owner.englishName || owner.khmerName,
              position: owner.position,
              assignmentType: "permanent", // default, no history
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
        // brands: depot.depotBrands.map((b) => ({
        //   id: b.brand.id,
        //   name: b.brand.name,
        // })),
        employees: employeesFormatted,
        timeline,
      };
    } catch (error) {
      logger.error(`Failed to get depot by id: ${id} - ${error.message}`);
      throw error;
    }
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
    const skip = (page - 1) * pageSize;
    const orderBy = { [sortBy]: sortOrder };

    const where = {};

    if (filters.status && filters.status !== "all") {
      where.status = filters.status;
    }

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

    if (filters.province) {
      where.district = {
        province: { name: { equals: filters.province, mode: "insensitive" } },
      };
    }

    if (filters.district) {
      where.district = {
        name: { equals: filters.district, mode: "insensitive" },
      };
    }

    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search, mode: "insensitive" } },
        { name: { contains: filters.search, mode: "insensitive" } },
        // Search by employee name (direct relation, not through assignments)
        {
          employee: {
            OR: [
              { khmerName: { contains: filters.search, mode: "insensitive" } },
              {
                englishName: { contains: filters.search, mode: "insensitive" },
              },
            ],
          },
        },
      ];
    }

    // Determine which fields to select
    const selectFields = {
      id: true,
      code: true,
      name: true,
      phone: true,
      status: true,
      createdAt: true,
      expiryDate: true,
      houseNumber: includeAddress, // conditionally include address fields
      street: includeAddress,
      village: includeAddress,
      commune: includeAddress,
      district: {
        select: {
          id: true,
          name: true,
          province: { select: { id: true, name: true } },
        },
      },
      employee: {
        // direct relation, not assignments
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
    };

    // Use transaction for parallel queries
    const [depots, totalCount] = await prisma.$transaction([
      prisma.depot.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        select: selectFields,
      }),
      prisma.depot.count({ where }),
    ]);

    // Format the response
    const formattedData = depots.map((depot) => {
      const owner = depot.employee; // direct employee reference
      const result = {
        id: depot.id,
        code: depot.code,
        name: depot.name,
        phone: depot.phone,
        status: depot.status,
        expiredDate: depot.expiryDate,
        createdAt: depot.createdAt,
        district: depot.district?.name,
        city: depot.district?.province?.name,
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
        page,
        pageSize,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        hasNext: page * pageSize < totalCount,
        hasPrev: page > 1,
      },
      filtersApplied: filters,
    };
  }

  /**
   * Parse and validate a single CSV row into a depot payload
   */
  /**
   * Parse and validate a single CSV row into a depot payload
   */
  _validateRow(data, rowIndex) {
    const errors = [];
    if (!data.name?.trim()) errors.push("name is required");
    if (!data.provinceName?.trim()) errors.push("provinceName is required");
    if (!data.districtName?.trim()) errors.push("districtName is required");

    const validStatuses = ["active", "inactive"];
    if (data.status && !validStatuses.includes(data.status.toLowerCase())) {
      errors.push(`status must be one of: ${validStatuses.join(", ")}`);
    }

    if (errors.length > 0) {
      throw new Error(`Row ${rowIndex}: ${errors.join("; ")}`);
    }
  }

  /**
   * Upsert province using cache
   */
  async _getOrCreateProvince(name, cache) {
    const key = name.trim().toLowerCase();
    if (cache.provinces.has(key)) return cache.provinces.get(key);

    let province = await prisma.province.findFirst({
      where: { name: { equals: name.trim(), mode: "insensitive" } },
    });

    if (!province) {
      province = await prisma.province.create({ data: { name: name.trim() } });
    }

    cache.provinces.set(key, province);
    return province;
  }

  /**
   * Upsert district using cache
   */
  async _getOrCreateDistrict(districtName, provinceId, cache) {
    const key = `${provinceId}:${districtName.trim().toLowerCase()}`;
    if (cache.districts.has(key)) return cache.districts.get(key);

    let district = await prisma.district.findFirst({
      where: {
        name: { equals: districtName.trim(), mode: "insensitive" },
        provinceId,
      },
    });

    if (!district) {
      district = await prisma.district.create({
        data: { name: districtName.trim(), provinceId },
      });
    }

    cache.districts.set(key, district);
    return district;
  }

  /**
   * Upsert employee using cache (returns employee object)
   */
  async _getOrCreateEmployee(data, cache) {
    if (!data.employeeName?.trim()) return null;

    const key = `${data.employeeName.trim().toLowerCase()}|${(data.employeeEmail || "").trim().toLowerCase()}`;
    if (cache.employees.has(key)) return cache.employees.get(key);

    let employee = await prisma.employee.findFirst({
      where: {
        englishName: { equals: data.employeeName.trim(), mode: "insensitive" },
        ...(data.employeeEmail?.trim() && { email: data.employeeEmail.trim() }),
      },
    });

    if (!employee) {
      employee = await prisma.employee.create({
        data: {
          englishName: data.employeeName.trim(),
          khmerName: data.employeeKhmerName?.trim() || data.employeeName.trim(),
          email: data.employeeEmail?.trim() || null,
          phone: data.employeePhone?.trim() || null,
          position: "Owner",
        },
      });
    }

    cache.employees.set(key, employee);
    return employee;
  }

  /**
   * Create a single depot from a CSV row (used inside bulk loop)
   */
  async createDepotBulk(data, cache, rowIndex) {
    this._validateRow(data, rowIndex);

    if (data.code?.trim()) {
      const existing = await prisma.depot.findUnique({
        where: { code: data.code.trim() },
      });
      if (existing)
        throw new Error(`Depot code "${data.code.trim()}" already exists`);
    }

    const province = await this._getOrCreateProvince(data.provinceName, cache);
    const district = await this._getOrCreateDistrict(
      data.districtName,
      province.id,
      cache,
    );
    const employee = await this._getOrCreateEmployee(data, cache);

    // ✅ Directly set employeeId (no assignment table)
    const depot = await prisma.depot.create({
      data: {
        name: data.name.trim(),
        code: data.code?.trim() || null,
        address: data.address?.trim() || null,
        phone: data.phone?.trim() || null,
        status: data.status?.trim().toLowerCase() || "active",
        provinceId: province.id,
        districtId: district.id,
        employeeId: employee?.id || null, // ← direct foreign key
      },
      include: {
        province: true,
        district: true,
      },
    });

    return depot;
  }

  _employeeCacheKey(data) {
    if (!data.employeeName?.trim()) return null;
    return `${data.employeeName.trim().toLowerCase()}|${(data.employeeEmail || "").trim().toLowerCase()}`;
  }

  /**
   * Prefetch / batch-create provinces, districts, and employees for bulk import.
   */
  async _warmBulkImportCaches(tx, records) {
    const cache = {
      provinces: new Map(),
      districts: new Map(),
      employees: new Map(),
      existingDepotCodes: new Set(),
    };

    const allProvinces = await tx.province.findMany();
    for (const p of allProvinces) {
      cache.provinces.set(p.name.trim().toLowerCase(), p);
    }

    const provinceNames = [
      ...new Set(records.map((r) => r.provinceName?.trim()).filter(Boolean)),
    ];
    const missingProvinces = provinceNames.filter(
      (name) => !cache.provinces.has(name.toLowerCase()),
    );

    if (missingProvinces.length > 0) {
      await tx.province.createMany({
        data: missingProvinces.map((name) => ({ name })),
        skipDuplicates: true,
      });
      const created = await tx.province.findMany({
        where: { name: { in: missingProvinces } },
      });
      for (const p of created) {
        cache.provinces.set(p.name.trim().toLowerCase(), p);
      }
    }

    const provinceIds = [
      ...new Set(
        provinceNames
          .map((n) => cache.provinces.get(n.toLowerCase())?.id)
          .filter(Boolean),
      ),
    ];

    if (provinceIds.length > 0) {
      const districts = await tx.district.findMany({
        where: { provinceId: { in: provinceIds } },
      });
      for (const d of districts) {
        cache.districts.set(
          `${d.provinceId}:${d.name.trim().toLowerCase()}`,
          d,
        );
      }
    }

    const districtsToCreate = [];
    const districtKeys = new Set();
    for (const record of records) {
      const pName = record.provinceName?.trim();
      const dName = record.districtName?.trim();
      if (!pName || !dName) continue;
      const province = cache.provinces.get(pName.toLowerCase());
      if (!province) continue;
      const key = `${province.id}:${dName.toLowerCase()}`;
      if (!cache.districts.has(key) && !districtKeys.has(key)) {
        districtKeys.add(key);
        districtsToCreate.push({ name: dName, provinceId: province.id });
      }
    }

    if (districtsToCreate.length > 0) {
      await tx.district.createMany({
        data: districtsToCreate,
        skipDuplicates: true,
      });
      const refreshed = await tx.district.findMany({
        where: { provinceId: { in: provinceIds } },
      });
      for (const d of refreshed) {
        cache.districts.set(
          `${d.provinceId}:${d.name.trim().toLowerCase()}`,
          d,
        );
      }
    }

    const employeeNames = [
      ...new Set(records.map((r) => r.employeeName?.trim()).filter(Boolean)),
    ];
    const employeeEmails = [
      ...new Set(records.map((r) => r.employeeEmail?.trim()).filter(Boolean)),
    ];

    const employeeOr = [];
    if (employeeNames.length > 0) {
      employeeOr.push({
        englishName: { in: employeeNames, mode: "insensitive" },
      });
    }
    if (employeeEmails.length > 0) {
      employeeOr.push({ email: { in: employeeEmails } });
    }

    if (employeeOr.length > 0) {
      const existingEmployees = await tx.employee.findMany({
        where: { OR: employeeOr },
      });
      for (const emp of existingEmployees) {
        const nameKey = (emp.englishName || "").trim().toLowerCase();
        const emailKey = (emp.email || "").trim().toLowerCase();
        cache.employees.set(`${nameKey}|${emailKey}`, emp);
        cache.employees.set(`${nameKey}|`, emp);
      }
    }

    const employeesToCreate = [];
    const pendingEmployeeKeys = new Set();
    for (const record of records) {
      const key = this._employeeCacheKey(record);
      if (!key || cache.employees.has(key) || pendingEmployeeKeys.has(key)) {
        continue;
      }
      pendingEmployeeKeys.add(key);
      employeesToCreate.push({
        englishName: record.employeeName.trim(),
        khmerName:
          record.employeeKhmerName?.trim() || record.employeeName.trim(),
        email: record.employeeEmail?.trim() || null,
        phone: record.employeePhone?.trim() || null,
        position: "Owner",
      });
    }

    if (employeesToCreate.length > 0) {
      const createdEmployees = await tx.employee.createManyAndReturn({
        data: employeesToCreate,
      });
      for (const emp of createdEmployees) {
        const key = `${(emp.englishName || "").trim().toLowerCase()}|${(emp.email || "").trim().toLowerCase()}`;
        cache.employees.set(key, emp);
      }
    }

    const codes = records.map((r) => r.code?.trim()).filter(Boolean);
    if (codes.length > 0) {
      const existing = await tx.depot.findMany({
        where: { code: { in: codes } },
        select: { code: true },
      });
      for (const d of existing) {
        if (d.code) cache.existingDepotCodes.add(d.code);
      }
    }

    return cache;
  }

  _resolveBulkRow(record, cache, rowNumber) {
    this._validateRow(record, rowNumber);

    const code = record.code?.trim() || null;
    if (code) {
      if (cache.existingDepotCodes.has(code)) {
        throw new Error(`Depot code "${code}" already exists`);
      }
      cache.existingDepotCodes.add(code);
    }

    const province = cache.provinces.get(
      record.provinceName.trim().toLowerCase(),
    );
    if (!province) {
      throw new Error(`Province "${record.provinceName}" not found`);
    }

    const district = cache.districts.get(
      `${province.id}:${record.districtName.trim().toLowerCase()}`,
    );
    if (!district) {
      throw new Error(
        `District "${record.districtName}" not found for province "${record.provinceName}"`,
      );
    }

    const empKey = this._employeeCacheKey(record);
    const employee = empKey ? cache.employees.get(empKey) : null;

    return {
      depotData: {
        name: record.name.trim(),
        code,
        address: record.address?.trim() || null,
        phone: record.phone?.trim() || null,
        status: record.status?.trim().toLowerCase() || "active",
        provinceId: province.id,
        districtId: district.id,
        employeeId: employee?.id ?? null, // ✅ direct assignment
      },
    };
  }

  /**
   * Bulk import depots — batched DB writes.
   * Returns { results, errors }
   */
  async bulkCreateDepots(records) {
    const results = [];
    const errors = [];
    const DEPOT_CHUNK = 100;

    const candidates = [];
    for (const [index, record] of records.entries()) {
      const rowNumber = index + 1;
      try {
        this._validateRow(record, rowNumber);
        candidates.push({ rowNumber, record });
      } catch (err) {
        errors.push({ row: rowNumber, data: record, error: err.message });
      }
    }

    if (candidates.length === 0) {
      return { results, errors };
    }

    const startedAt = Date.now();

    await prisma.$transaction(
      async (tx) => {
        const cache = await this._warmBulkImportCaches(
          tx,
          candidates.map((c) => c.record),
        );

        const prepared = [];
        for (const { rowNumber, record } of candidates) {
          try {
            const resolved = this._resolveBulkRow(record, cache, rowNumber);
            prepared.push({ rowNumber, record, ...resolved });
          } catch (err) {
            errors.push({ row: rowNumber, data: record, error: err.message });
          }
        }

        for (let i = 0; i < prepared.length; i += DEPOT_CHUNK) {
          const chunk = prepared.slice(i, i + DEPOT_CHUNK);
          const created = await tx.depot.createManyAndReturn({
            data: chunk.map((c) => c.depotData),
            select: {
              id: true,
              name: true,
              code: true,
              provinceId: true,
              districtId: true,
              status: true,
              employeeId: true,
            },
          });

          for (let j = 0; j < created.length; j++) {
            results.push({
              row: chunk[j].rowNumber,
              depot: created[j],
            });
          }
        }
      },
      { timeout: 120000, maxWait: 15000 },
    );

    logger.info(
      `Bulk depot import: ${results.length} created, ${errors.length} failed in ${Date.now() - startedAt}ms`,
    );

    return {
      results: results.map(({ row, depot }) => ({ row, depot })),
      errors,
    };
  }
}

export default new DepotService();
