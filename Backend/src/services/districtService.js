import { prisma } from '../config/db.js';
import logger from '../config/logger.js';
import Excel from 'exceljs';

class DistrictService {
  // Get All Districts with Filters

  async getAll(query = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        provinceId,
        sortBy = "name",
        sortOrder = "asc",
        search = "",
      } = query;

      const where = {};

      if (provinceId) {
        where.provinceId = parseInt(provinceId);
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { code: { contains: search, mode: "insensitive" } },
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      // Whitelist allowed sort fields
      const allowedSortFields = ["name", "code", "createdAt", "id"];
      const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : "name";
      const validSortOrder = sortOrder === "desc" ? "desc" : "asc";

      const [districts, total] = await Promise.all([
        prisma.district.findMany({
          where,
          skip,
          take,
          include: {
            province: {
              select: { name: true, code: true },
            },
          },
          orderBy: { [validSortBy]: validSortOrder },
        }),
        prisma.district.count({ where }),
      ]);

      // Format data for frontend (flatten province name)
      const formattedDistricts = districts.map((district) => ({
        id: district.id,
        name: district.name,
        code: district.code,
        provinceId: district.provinceId,
        provinceName: district.province?.name || null,
        provinceCode: district.province?.code || null,
        createdAt: district.createdAt,
        updatedAt: district.updatedAt,
        // add any other fields your frontend expects
      }));

      return {
        districts: formattedDistricts,
        pagination: {
          total,
          page: parseInt(page),
          limit: take,
          pages: Math.ceil(total / take),
        },
      };
    } catch (error) {
      logger.error("DistrictService getAll error:", error);
      throw error;
    }
  }

  async getById(id) {
    try {
      return await prisma.district.findUnique({
        where: { id: parseInt(id) },
        include: {
          province: true,
          depots: true,
        },
      });
    } catch (error) {
      logger.error("DistrictService getById error:", error);
      throw error;
    }
  }

  async create(data) {
    try {
      // Create District
      const { name, code, provinceId } = data;
      if (!name || !code || !provinceId) {
        throw new Error("Name, code and province ID are required");
      }

      //check if province exist
      const existingProvince = await prisma.province.findUnique({
        where: { id: parseInt(provinceId) },
      });
      if (!existingProvince) {
        throw new Error("Province not found");
      }

      //check if district code already exist
      const existingDistrict = await prisma.district.findFirst({
        where: { code },
      });
      if (existingDistrict) {
        throw new Error("District code already exists");
      }

      const district = await prisma.district.create({
        data: {
          name,
          code,
          provinceId: parseInt(provinceId),
        },
      });

      logger.info(`District created: ${district.code} - ${district.name}`);
      return district;
    } catch (error) {
      logger.error("DistrictService create error:", error);
      throw error;
    }
  }

  async update(id, data) {
    try {
      return await prisma.district.update({
        where: { id: parseInt(id) },
        data: {
          name: data.name,
          code: data.code,
          provinceId: data.provinceId ? parseInt(data.provinceId) : undefined,
        },
      });
    } catch (error) {
      logger.error("DistrictService update error:", error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const districtId = parseInt(id);
      if (isNaN(districtId)) {
        throw new Error("Invalid district ID");
      }

      // First, check if the district exists
      const existingDistrict = await prisma.district.findUnique({
        where: { id: districtId },
        select: { id: true },
      });

      if (!existingDistrict) {
        throw new Error("District not found");
      }

      // Check for dependent depots
      const depotsCount = await prisma.depot.count({
        where: { districtId: districtId },
      });

      if (depotsCount > 0) {
        throw new Error(
          `Cannot delete district: ${depotsCount} depot(s) are using it`,
        );
      }

      // Proceed with deletion
      const deleted = await prisma.district.delete({
        where: { id: districtId },
      });

      return deleted;
    } catch (error) {
      logger.error("DistrictService delete error:", error);
      throw error; // rethrow so controller can handle
    }
  }

  //bulk Operation
  // ---------- Generate Template ----------
  async generateDistrictTemplate() {
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet("Districts");

    worksheet.columns = [
      { header: "provinceName *", key: "provinceName", width: 25 },
      { header: "districtName *", key: "districtName", width: 25 },
      { header: "code", key: "code", width: 20 },
    ];
    worksheet.getRow(1).font = { bold: true };
    worksheet.addRow({
      provinceName: "Phnom Penh",
      districtName: "Chamkar Mon",
      code: "PPM",
    });
    worksheet.addRow({
      provinceName: "Siem Reap",
      districtName: "Siem Reap City",
      code: "SRC",
    });

    return await workbook.xlsx.writeBuffer();
  }

  // ---------- Verify Import ----------
  async verifyDistrictImport(fileBuffer) {
    const workbook = new Excel.Workbook();
    await workbook.xlsx.load(fileBuffer);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) throw new Error("Worksheet not found");

    // Pre-fetch all provinces (name -> id) – case-insensitive key
    const provinces = await prisma.province.findMany({
      select: { id: true, name: true },
    });
    const provinceMap = new Map(
      provinces.map((p) => [p.name.toLowerCase(), p.id]),
    );

    // Pre-fetch existing districts (for duplicate checks)
    const existingDistricts = await prisma.district.findMany({
      select: { name: true, provinceId: true, code: true },
    });
    const existingKeys = new Set(
      existingDistricts.map((d) => `${d.provinceId}|${d.name.toLowerCase()}`),
    );
    const existingCodes = new Set(
      existingDistricts.map((d) => d.code).filter(Boolean),
    );

    const validRows = [];
    const invalidRows = [];

    // Collect all unique province names from the sheet first,
    // then batch-create missing ones before processing rows
    const provinceNamesInFile = new Set();
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const name = row.getCell(1).value?.toString()?.trim();
      if (name) provinceNamesInFile.add(name.toLowerCase());
    });

    // Auto-create any provinces not already in the DB
    for (const provinceName of provinceNamesInFile) {
      if (!provinceMap.has(provinceName)) {
        const created = await prisma.province.create({
          data: {
            name: provinceName
              .split(" ")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" "),
            // add any other required fields here (e.g. status: 'active')
          },
          select: { id: true, name: true },
        });
        // Add to the in-memory map so row processing below finds it immediately
        provinceMap.set(provinceName, created.id);
      }
    }

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header

      const provinceNameRaw = row.getCell(1).value?.toString();
      const districtNameRaw = row.getCell(2).value?.toString();
      const codeRaw = row.getCell(3).value?.toString();

      const provinceName = provinceNameRaw?.trim();
      const districtName = districtNameRaw?.trim();
      const code = codeRaw?.trim() || null;

      // Skip completely empty rows
      if (!provinceName && !districtName && !code) return;

      const errors = [];

      if (!provinceName) errors.push("Province name is required");
      if (!districtName) errors.push("District name is required");

      // Province is guaranteed to exist now (created above if missing)
      let provinceId = null;
      if (provinceName) {
        provinceId = provinceMap.get(provinceName.toLowerCase()) ?? null;
      }

      // Duplicate district check (case-insensitive name + province)
      if (districtName && provinceId) {
        const key = `${provinceId}|${districtName.toLowerCase()}`;
        if (existingKeys.has(key)) {
          errors.push(
            `District "${districtName}" already exists in province "${provinceName}"`,
          );
        }
      }

      // Duplicate code check
      if (code && existingCodes.has(code)) {
        errors.push(`District code "${code}" already exists`);
      }

      if (errors.length) {
        invalidRows.push({ rowNumber, errors });
      } else {
        // Add to in-memory cache to catch duplicates within the same file
        const newKey = `${provinceId}|${districtName.toLowerCase()}`;
        existingKeys.add(newKey);
        if (code) existingCodes.add(code);

        validRows.push({
          rowNumber,
          data: {
            provinceId,
            name: districtName,
            code,
            status: "active",
          },
        });
      }
    });

    return {
      summary: {
        totalRows: validRows.length + invalidRows.length,
        validCount: validRows.length,
        invalidCount: invalidRows.length,
      },
      validRows,
      invalidRows,
    };
  }

  async bulkImportDistricts(fileBuffer) {
    const verification = await this.verifyDistrictImport(fileBuffer);

    if (verification.validRows.length === 0) {
      throw new Error(
        "No valid rows to import. Please fix all errors and try again.",
      );
    }

    const results = {
      imported: [],
      failed: [...verification.invalidRows],
      totalValid: verification.validRows.length,
      totalInvalid: verification.invalidRows.length,
    };

    // Prepare data for insertion – NO STATUS FIELD
    const districtsToCreate = verification.validRows.map((v) => ({
      provinceId: v.data.provinceId,
      name: v.data.name,
      code: v.data.code,
    }));

    const CHUNK_SIZE = 500;
    let totalInserted = 0;

    for (let i = 0; i < districtsToCreate.length; i += CHUNK_SIZE) {
      const chunk = districtsToCreate.slice(i, i + CHUNK_SIZE);
      const result = await prisma.district.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      totalInserted += result.count;
      for (let j = 0; j < chunk.length; j++) {
        results.imported.push({
          row: verification.validRows[i + j].rowNumber,
          district: chunk[j].name,
          provinceId: chunk[j].provinceId,
        });
      }
    }

    const skipped = verification.validRows.length - totalInserted;
    if (skipped > 0) {
      results.failed.push({
        type: "duplicate_in_db",
        count: skipped,
        message:
          "Some rows were not inserted because they conflicted with existing data (unexpected).",
      });
    }

    return {
      importedCount: totalInserted,
      skippedCount: verification.invalidRows.length + skipped,
      message: `Imported ${totalInserted} district(s). ${verification.invalidRows.length} invalid row(s) skipped.`,
      details: results,
    };
  }
}

export default new DistrictService();
