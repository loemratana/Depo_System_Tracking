import { prisma } from "../config/db.js";
import logger from "../config/logger.js";

class DepotService {
  async createDepot(data) {
    try {
      // Use a single, mandatory field: 'name'
      if (!data.name) {
        throw new Error("Depot name is required (field 'name')");
      }

      // 1. Check depot code uniqueness
      if (data.code) {
        const existing = await prisma.depot.findUnique({
          where: { code: data.code },
        });
        if (existing) throw new Error("Depot code already exists");
      }

      // 2. Handle employee (existing ID or create from name)
      let employeeId = data.employeeId;
      if (!employeeId && data.employeeName) {
        const newEmployee = await prisma.employee.create({
          data: {
            englishName: data.employeeName,
            khmerName: data.employeeKhmerName || data.employeeName,
            email: data.employeeEmail || null,
            phone: data.employeePhone || null,
            position: "Owner",
          },
        });
        employeeId = newEmployee.id;
        logger.info(
          `Created new employee: ${newEmployee.englishName} (ID: ${newEmployee.id})`,
        );
      } else if (employeeId) {
        const exists = await prisma.employee.findUnique({
          where: { id: employeeId },
        });
        if (!exists) throw new Error(`Employee ${employeeId} not found`);
      }

      // 3. Province & district
      let province = await prisma.province.findFirst({
        where: { name: data.provinceName },
      });
      if (!province)
        province = await prisma.province.create({
          data: { name: data.provinceName },
        });

      let district = await prisma.district.findFirst({
        where: { name: data.districtName, provinceId: province.id },
      });
      if (!district)
        district = await prisma.district.create({
          data: { name: data.districtName, provinceId: province.id },
        });

      // 4. Create depot
      const depot = await prisma.depot.create({
        data: {
          name: data.name,
          code: data.code,
          address: data.address,
          phone: data.phone,
          status: data.status || "active",
          provinceId: province.id, // FIX: was `province: province.id` (raw int on relation field)
          districtId: district.id,
          houseNumber: data.homeNumber || data.houseNumber,
          street: data.street,
          village: data.village,
          commune: data.commune,
          expiryDate: data.expiryDate,
          ...(employeeId && {
            employees: { connect: { id: employeeId } },
          }),
        },
        include: {
          district: { include: { province: true } },
          employees: true,
        },
      });

      if (employeeId) {
        await prisma.assignment.create({
          // FIX: was `prisma.assign` (wrong model name)
          data: {
            employeeId: employeeId, // FIX: was `data.employeeId` (undefined when created from name)
            depotId: depot.id,
            startDate: new Date(),
          },
        });
      }

      logger.info(
        `Depot created: ${depot.code} - ${depot.name}${depot.employees.length ? `, assigned to ${depot.employees[0].englishName}` : ""}`,
      );
      return depot;
    } catch (error) {
      // Re-throw or handle as needed
      throw error;
    }
  }

  async upateDepot(id, data) {
    try {
      //1.check if depot exist

      const existingDepot = await prisma.depot.findUnique({
        where: { id },
        include: {
          employees: true,
        },
      });
      if (!existingDepot) {
        throw new Error(`Depot not found`);
      }

      // 2. Check code uniqueness (if code is being changed)

      if (data.code && data.code !== existingDepot.code) {
        const codeExists = await prisma.depot.findUnique({
          where: { code: data.code },
        });
        if (codeExists) {
          throw new Error("Depot code already exists");
        }
      }

      // 3. Resolve employee assignment (similar to create)

      let employeeId = data.employeeId;

      let disconnectOld = false;

      if (data.employeeId === null) {
        // Explicitly remove all employee assignments
        disconnectOld = true;
      } else if (!employeeId && data.employeeName) {
        //
        const newEmployee = await prisma.employee.create({
          data: {
            englishName: data.employeeName,
            khmerName: data.employeeKhmerName || data.employeeName,
            email: data.employeeEmail || null,
            phone: data.employeePhone || null,
            position: "Owner",
          },
        });
        employeeId = newEmployee.id;
        logger.info(
          `Created new employee: ${newEmployee.englishName} (ID: ${newEmployee.id})`,
        );
      } else if (employeeId) {
        // Verify existing employee exists
        const employee = await prisma.employee.findUnique({
          where: { id: employeeId },
        });
        if (!employee) {
          throw new Error(`Employee with id ${employeeId} not found`);
        }
      }
      // 4. Prepare update data
      const updateData = {
        name: data.name,
        code: data.code,
        address: data.address,
        phone: data.phone,
        status: data.status,
        districtId: data.districtId,
      };
      // Remove undefined fields
      Object.keys(updateData).forEach(
        (key) => updateData[key] === undefined && delete updateData[key],
      );

      // 5. Handle employee relation
      if (disconnectOld) {
        updateData.employees = { set: [] }; // disconnect all
      } else if (employeeId) {
        // Replace current employee(s) with this one (assuming depot has at most one employee)
        updateData.employees = {
          set: [{ id: employeeId }],
        };
      }

      // If no employeeId and no employeeName and not disconnect, leave employees unchanged

      // 6. Update depot
      const updatedDepot = await prisma.depot.update({
        where: { id },
        data: updateData,
        include: {
          district: true,
          employees: true,
        },
      });

      logger.info(`Depot updated: ${updatedDepot.code} - ${updatedDepot.name}`);
      return updatedDepot;
    } catch (error) {
      logger.error(`Failed to update depot: ${id} - ${error.message}`);
      throw error;
    }
  }

  async getById(id) {
    try {
      // Run depot fetch + assignment queries in parallel for performance
      const [depot, assignmentRows] = await Promise.all([
        prisma.depot.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
            phone: true,
            address: true,
            createdAt: true,
            district: {
              select: {
                name: true,
                province: { select: { name: true } },
              },
            },
            employees: {
              take: 1,
              select: {
                id: true,
                khmerName: true,
                englishName: true,
                employeeCode: true,
                phone: true,
                email: true,
                position: true,
              },
            },
            depotBrands: {
              select: {
                brand: { select: { id: true, name: true } },
              },
            },
          },
        }),
        // Fetch assignments once and reuse for both employees list and timeline
        prisma.assignment.findMany({
          where: { depotId: id },
          select: {
            assignmentType: true,
            createdAt: true,
            employee: {
              select: {
                id: true,
                khmerName: true,
                englishName: true,
                position: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
      ]);

      if (!depot) {
        throw new Error(`Depot not found`);
      }

      // Build employees list from assignment rows
      const employeesFormatted = assignmentRows.map((a) => ({
        id: a.employee.id,
        name: a.employee.englishName || a.employee.khmerName,
        position: a.employee.position,
        assignmentType: a.assignmentType,
      }));

      // Build timeline from the same assignment rows (top 10)
      const timeline = assignmentRows.slice(0, 10).map((a) => ({
        action: `Employee ${a.employee.englishName || a.employee.khmerName} assigned (${a.assignmentType})`,
        createdAt: a.createdAt.toISOString().split("T")[0],
      }));

      // Build owner from first employee relation on depot
      const owner = depot.employees[0]
        ? {
            id: depot.employees[0].id,
            khmerName: depot.employees[0].khmerName,
            englishName: depot.employees[0].englishName,
            employeeCode: depot.employees[0].employeeCode,
            phone: depot.employees[0].phone,
            email: depot.employees[0].email,
            position: depot.employees[0].position,
          }
        : null;

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
          district: depot.district.name,
          province: depot.district.province.name,
        },
        owner,
        brands: depot.depotBrands.map((b) => ({
          id: b.brand.id,
          name: b.brand.name,
        })),
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
            employees: {
              some: {
                khmerName: { contains: filters.search, mode: "insensitive" },
              },
            },
          },
          {
            employees: {
              some: {
                englishName: { contains: filters.search, mode: "insensitive" },
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

    // Build where clause
    const where = {};

    if (filters.status && filters.status !== "all") {
      where.status = filters.status;
    }
    //

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
        {
          employees: {
            some: {
              khmerName: { contains: filters.search, mode: "insensitive" },
            },
          },
        },
        {
          employees: {
            some: {
              englishName: { contains: filters.search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    // Determine which fields to select (exclude address by default)
    const selectFields = {
      id: true,
      code: true,
      name: true,
      phone: true,
      status: true,
      createdAt: true,
      // updatedAt: true,
      district: {
        select: {
          id: true,
          name: true,
          province: { select: { id: true, name: true } },
        },
      },
      employees: {
        take: 1,
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

    // Include address fields only if requested (for detail view)
    // if (includeAddress) {
    //     selectFields.houseNumber = true;
    //     selectFields.street = true;
    //     selectFields.village = true;
    //     selectFields.commune = true;
    // }

    //fetch parallel query

    // Execute queries for data and total count using Prisma transaction to reduce network roundtrips
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

    // Format the response (flatten district and owner info)
    const formattedData = depots.map((depot) => {
      const owner = depot.employees?.[0] || null;
      const result = {
        id: depot.id,
        code: depot.code,
        name: depot.name,
        phone: depot.phone,
        status: depot.status,
        // expiredDate: depot.expiredDate,
        createdAt: depot.createdAt,
        district: depot.district?.name,
        city: depot.district?.province?.name,
        owner: owner
          ? {
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

    // Return paginated results
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
   * Upsert employee using cache
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

    // Check code uniqueness
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

    const depot = await prisma.depot.create({
      data: {
        name: data.name.trim(),
        code: data.code?.trim() || null,
        address: data.address?.trim() || null,
        phone: data.phone?.trim() || null,
        status: data.status?.trim().toLowerCase() || "active",
        provinceId: province.id,
        districtId: district.id,
        ...(employee && {
          employees: { connect: { id: employee.id } },
        }),
      },
      include: {
        province: true,
        district: true,
        employees: true,
      },
    });

    if (employee) {
      await prisma.assignment.create({
        data: {
          employeeId: employee.id,
          depotId: depot.id,
          startDate: new Date(),
        },
      });
    }

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
      },
      employeeId: employee?.id ?? null,
    };
  }

  /**
   * Bulk import depots — batched DB writes (much faster than per-row inserts).
   * Returns { results, errors }
   */
  async bulkCreateDepots(records) {
    const results = [];
    const errors = [];
    const DEPOT_CHUNK = 100;
    const EMPLOYEE_LINK_BATCH = 25;

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
            },
          });

          for (let j = 0; j < created.length; j++) {
            results.push({
              row: chunk[j].rowNumber,
              depot: created[j],
              employeeId: chunk[j].employeeId,
            });
          }
        }

        const assignmentRows = results
          .filter((r) => r.employeeId)
          .map((r) => ({
            employeeId: r.employeeId,
            depotId: r.depot.id,
            startDate: new Date(),
          }));

        if (assignmentRows.length > 0) {
          await tx.assignment.createMany({ data: assignmentRows });
        }

        const withEmployee = results.filter((r) => r.employeeId);
        for (let i = 0; i < withEmployee.length; i += EMPLOYEE_LINK_BATCH) {
          const batch = withEmployee.slice(i, i + EMPLOYEE_LINK_BATCH);
          await Promise.all(
            batch.map((r) =>
              tx.employee.update({
                where: { id: r.employeeId },
                data: { depotId: r.depot.id },
              }),
            ),
          );
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
