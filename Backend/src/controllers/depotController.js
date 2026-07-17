import depotService from '../services/depotService.js';
import { normalizeImportRow } from "../utils/importUtils.js";
import logger from '../config/logger.js';
import multer from "multer";
import { ReportService } from "../services/report/report.service.js";
import { parse } from "csv-parse";
import { prisma } from '../config/db.js';
const upload = multer({ dest: "uploads/" });
import ExcelJS from "exceljs";
function parseCSV(buffer) {
  return new Promise((resolve, reject) => {
    const records = [];

    const parser = parse({
      columns: true,           // first row = headers
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      bom: true,               // handle UTF-8 BOM from Excel exports
    });

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        records.push(record);
      }
    });

    parser.on('error', reject);
    parser.on('end', () => resolve(records));

    parser.write(buffer.toString('utf8'));
    parser.end();
  });
}
const reportService = new ReportService(depotService);

class DepotController {
  async createDepot(req, res) {
    try {
      const depot = await depotService.createDepot(req.body);
      res.status(201).json({
        success: true,
        message: "Depot created successfully",
        data: depot,
      });
    } catch (error) {
      logger.error(`Error creating depot: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message || "Error creating depot",
      });
    }
  }

  deleteDepot = async (req, res) => {
    try {
      const { id } = req.params;
      const depot = await depotService.delete(id);
      res.status(200).json({
        success: true,
        message: "Depot deleted successfully",
        data: depot,
      });
    } catch (error) {
      logger.error(`Error deleting depot: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message || "Error deleting depot",
      });
    }
  };

  getCounts=async (req, res) => {
  try {
  const counts = await depotService.getDepotCounts();
  res.status(200).json({
                         success: true,
                         data: counts,
                       });
  }
  catch (error) {
      logger.error(`Error fetching depot counts: ${error.message}`);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch depot statistics',
      });
    }
  }

  getSummary = async (req, res) => {
    try {
      const { brandId, brandIds } = req.query;
      const parsedBrandIds = brandIds
        ? String(brandIds)
            .split(",")
            .map((id) => parseInt(id.trim(), 10))
            .filter((id) => !isNaN(id))
        : undefined;

      const summary = await depotService.getDepotSummary({
        brandId: brandId ? parseInt(brandId, 10) : undefined,
        brandIds: parsedBrandIds?.length ? parsedBrandIds : undefined,
      });

      res.status(200).json({ success: true, data: summary });
    } catch (error) {
      logger.error(`Error fetching depot summary: ${error.message}`);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch depot summary",
      });
    }
  };

  //find count depots not assignment
  findDepotNotAssigned = async (req, res) => {
    try {
      {
        const count = await depotService.findDepotNotAssigned();

        res.status(200).json({
          success: true,
          message: "Depot not assigned",
          data: count,
        });
      }
    } catch (error) {
      logger.error(`Error findDepotNotAssigned: ${error.message}`);
    }
  };

  updateDepot = async (req, res) => {
    try {
      const { id } = req.params;
      const depot = await depotService.updateDepot(id, req.body);
      res.status(200).json({
        success: true,
        message: "Depot updated successfully",
        data: depot,
      });
    } catch (error) {
      logger.error(`Error updating depot: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message || "Error updating depot",
      });
    }
  };

  //generate report

  getDepotReport = async (req, res, next) => {
    try {
      const { fromDate, toDate, groupBy, format } = req.query;

      if (format === 'pdf' || format === 'excel' || format === 'csv') {
        return this.exportDepotReport(req, res, next);
      }

      const result = await depotService.getDepotReport({
        fromDate,
        toDate,
        groupBy,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error("Depot report error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to generate report" });
    }
  };
  // Get all depots with flexible filtering
  getAllDepots = async (req, res) => {
    try {
      const { page, pageSize, sortBy, sortOrder, ...filters } = req.query;

      const result = await depotService.getAllDepot({
        page: parseInt(page) || 1,
        pageSize: parseInt(pageSize) || 10,
        sortBy: sortBy || "createdAt",
        sortOrder: sortOrder || "desc",
        filters: filters,
      });

      return res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        filtersApplied: result.filtersApplied,
      });
    } catch (error) {
      logger.error(`Error fetching depots: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  };
  /**
   * POST /api/depots/bulk-import
   * Expects multipart/form-data with field "file" (CSV)
   *
   * Required CSV columns : name, provinceName, districtName
   * Optional CSV columns : code, address, phone, status,
   *                        employeeName, employeeKhmerName,
   *                        employeeEmail, employeePhone
   */
  bulkImport = async (req, res) => {
    try {
      // multer middleware (upload.single('file')) runs before this handler
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded. Send a CSV file with field name "file".',
        });
      }

      // ── 1. Parse CSV ──────────────────────────────────────────────────────
      let records;
      try {
        records = await parseCSV(req.file.buffer);
      } catch (parseErr) {
        return res.status(400).json({
          success: false,
          message: `CSV parse error: ${parseErr.message}`,
        });
      }

      if (records.length === 0) {
        return res.status(400).json({
          success: false,
          message: "CSV file is empty or has no data rows.",
        });
      }

      console.log(
        `[BulkImport] Parsed ${records.length} rows from "${req.file.originalname}"`,
      );

      // ── 2. Process rows via service ───────────────────────────────────────
      const { results, errors } = await depotService.bulkCreateDepots(records);

      console.log(
        `[BulkImport] Done — ${results.length} created, ${errors.length} failed`,
      );

      // ── 3. Respond ────────────────────────────────────────────────────────
      return res.status(207).json({
        success: true,
        message: `${results.length} depot(s) imported, ${errors.length} failed.`,
        summary: {
          total: records.length,
          created: results.length,
          failed: errors.length,
        },
        data: results,
        errors,
      });
    } catch (err) {
      console.error("[BulkImport] Unexpected error:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error during bulk import.",
      });
    }
  };

  /**
   * POST /api/depots/bulk-import-json
   * Accepts a JSON array of already-mapped depot row objects.
   * Keys: name, provinceName, districtName, code, phone, address, status,
   *       employeeName, employeeEmail, employeePhone, employeeKhmerName, brandCode, brandName
   */
  bulkImportJson = async (req, res) => {
    try {
      const records = req.body;

      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Request body must be a non-empty JSON array of depot rows.',
        });
      }

      console.log(`[BulkImportJson] Received ${records.length} rows`);

      const { results, errors } = await depotService.bulkCreateDepots(records);

      const created = results.filter((r) => r.action === "created").length;
      const updated = results.filter((r) => r.action === "updated").length;
      const imported = created + updated;

      console.log(`[BulkImportJson] Done — ${created} created, ${updated} updated, ${errors.length} failed`);

      return res.status(207).json({
        success: true,
        message: `${imported} depot(s) imported (${created} created, ${updated} updated), ${errors.length} failed.`,
        summary: {
          total: records.length,
          created,
          updated,
          imported,
          failed: errors.length,
        },
        data: results,
        errors,
      });
    } catch (err) {
      console.error('[BulkImportJson] Unexpected error:', err);
      return res.status(500).json({
        success: false,
        message: `Internal server error during bulk import: ${err.message}`,
        detail: err.message,
      });
    }
  };
  // Get depot by ID
  getDepotById = async (req, res) => {
    try {
      const { id } = req.params;
      // Parse to int if your IDs are integers, Prisma expects the correct type
      const parsedId = isNaN(parseInt(id)) ? id : parseInt(id);

      const depot = await depotService.getById(parsedId);

      return res.status(200).json({
        success: true,
        data: depot,
      });
    } catch (error) {
      logger.error(`Error fetching depot by id: ${error.message}`);
      if (error.message === "Depot not found") {
        return res.status(404).json({
          success: false,
          message: "Depot not found",
        });
      }
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  };

  // report block

  exportDepotReport = async (req, res, next) => {
    try {
      const { format = 'pdf' } = req.query;
      const fromDate = req.body?.fromDate || req.query.fromDate;
      const toDate = req.body?.toDate || req.query.toDate;
      const status = req.body?.status || req.query.status;

      // Basic validation
      if (fromDate && isNaN(new Date(fromDate).getTime())) {
        return res.status(400).json({ error: 'Invalid fromDate' });
      }
      if (toDate && isNaN(new Date(toDate).getTime())) {
        return res.status(400).json({ error: 'Invalid toDate' });
      }

      const result = await reportService.exportReport(format, { fromDate, toDate, status });

      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Length', result.buffer.length);
      res.send(result.buffer);
    } catch (error) {
      next(error);
    }
  }

  // Inside DepotController class, add this method:

  validateDepotImport = async (req, res) => {
    try {
      const rows = req.body; // array of CSV row objects

      if (!Array.isArray(rows) || rows.length === 0) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Send an array of CSV rows to validate.",
          });
      }

      // Normalize rows (cleans #N/A etc.)
      rows.forEach(normalizeImportRow);

      // ── 1. Per-row validation with auto-fill ──────────────────────────────
      const rowErrors = [];
      const rowWarnings = [];

      for (const [i, row] of rows.entries()) {
        const rowNumber = i + 1;
        const errors = [];
        const warnings = [];

        // ── Auto-fill missing required fields ──
        if (!row.name?.trim()) {
          row.name = "Unnamed Depot";
          warnings.push("Depot name missing – defaulted to 'Unnamed Depot'");
        } else if (row.name.trim().toLowerCase() === "vacancy") {
          warnings.push("Depot name is 'Vacancy' – inserted as‑is");
        }

        if (!row.provinceName?.trim()) {
          row.provinceName = "Phnom Penh"; // or your default
          warnings.push("Province missing – defaulted to 'Phnom Penh'");
        } else if (row.provinceName.trim().toLowerCase() === "vacancy") {
          warnings.push("Province is 'Vacancy' – will be created/used as‑is");
        }

        if (!row.districtName?.trim()) {
          row.districtName = "Daun Penh"; // or your default
          warnings.push("District missing – defaulted to 'Daun Penh'");
        } else if (row.districtName.trim().toLowerCase() === "vacancy") {
          warnings.push("District is 'Vacancy' – will be created/used as‑is");
        }

        // ── Status (optional) ──
        const validStatuses = ["active", "inactive"];
        if (row.status && !validStatuses.includes(row.status.trim().toLowerCase())) {
          errors.push(`status must be "active" or "inactive", got "${row.status}"`);
        } else if (!row.status) {
          row.status = "active";
          warnings.push("Status missing – defaulted to 'active'");
        }

        // ── Email validation ──
        if (row.employeeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.employeeEmail.trim())) {
          errors.push(`employeeEmail "${row.employeeEmail}" is not a valid email`);
        }

        // ── Date and sex validation (optional) – we can skip for simplicity or keep
        // but we already have parseImportDate in utils, so we can add if needed.

        if (errors.length > 0) {
          rowErrors.push({ row: rowNumber, data: row, errors });
        }
        if (warnings.length > 0) {
          rowWarnings.push({ row: rowNumber, data: row, warnings });
        }


      }

      // ── 2. Duplicate codes within the CSV ──────────────────────────
      const csvCodes = rows.map((r) => r.code?.trim()).filter(Boolean);
      const csvDuplicateCodes = csvCodes.filter(
        (code, i) => csvCodes.indexOf(code) !== i,
      );
      const uniqueCsvDuplicates = [...new Set(csvDuplicateCodes)];

      // ── 3. Collect unique values to query DB ──────────────────────────────
      const codes = [...new Set(csvCodes)];
      const employeeNames = [
        ...new Set(rows.map((r) => r.employeeName?.trim()).filter(Boolean)),
      ];
      const emails = [
        ...new Set(rows.map((r) => r.employeeEmail?.trim()).filter(Boolean)),
      ];
      const provinceNames = [
        ...new Set(rows.map((r) => r.provinceName?.trim()).filter(Boolean)),
      ];

      // ── 4. DB checks (all in parallel) ───────────────────────────────────
      const [existingDepotCodes, existingEmployees, existingProvinces] =
        await Promise.all([
          // Depot codes already in DB
          codes.length > 0
            ? prisma.depot.findMany({
              where: { code: { in: codes } },
              select: { code: true },
            })
            : [],

          // Employees already in DB (by name or email)
          employeeNames.length > 0 || emails.length > 0
            ? prisma.employee.findMany({
              where: {
                OR: [
                  ...(employeeNames.length > 0
                    ? [
                      {
                        englishName: {
                          in: employeeNames,
                          mode: "insensitive",
                        },
                      },
                    ]
                    : []),
                  ...(emails.length > 0 ? [{ email: { in: emails } }] : []),
                ],
              },
              select: { englishName: true, email: true },
            })
            : [],

          // Provinces already in DB (to know which will be auto-created)
          provinceNames.length > 0
            ? prisma.province.findMany({
              where: { name: { in: provinceNames, mode: "insensitive" } },
              select: { name: true },
            })
            : [],
        ]);

      // ── 5. Build readable summaries ───────────────────────────────────────
      const dbDuplicateCodes = existingDepotCodes.map((d) => d.code);
      const allDuplicateCodes = [
        ...new Set([...uniqueCsvDuplicates, ...dbDuplicateCodes]),
      ];

      const existingEmployeeMap = existingEmployees.map((e) => ({
        englishName: e.englishName,
        email: e.email,
        note: "Employee already exists — will be linked, not re-created",
      }));

      const existingProvinceNames = existingProvinces.map((p) => p.name);
      const newProvinces = provinceNames.filter(
        (n) =>
          !existingProvinceNames.some(
            (ep) => ep.toLowerCase() === n.toLowerCase(),
          ),
      );

      // Rows that will be blocked (duplicate code in DB)
      const blockedRows = rows
        .map((r, i) => ({
          row: i + 1,
          code: r.code?.trim(),
          name: r.name?.trim(),
        }))
        .filter((r) => r.code && dbDuplicateCodes.includes(r.code));

      // ── 6. Overall readiness ──────────────────────────────────────────────
      const canImport =
        rowErrors.length === 0 &&
        blockedRows.length === 0 &&
        uniqueCsvDuplicates.length === 0;

      return res.json({
        success: true,
        canImport,
        summary: {
          totalRows: rows.length,
          validRows: rows.length - rowErrors.length - blockedRows.length,
          rowsWithErrors: rowErrors.length,
          blockedByDB: blockedRows.length,
        },
        checks: {
          // Structural errors per row
          rowErrors,

          // Warnings per row
          rowWarnings: rowWarnings.length > 0 ? rowWarnings : undefined,

          // Codes duplicated inside the CSV
          csvDuplicateCodes:
            uniqueCsvDuplicates.length > 0
              ? { found: true, codes: uniqueCsvDuplicates }
              : { found: false },

          // Codes already in the database
          dbDuplicateCodes:
            dbDuplicateCodes.length > 0
              ? { found: true, codes: dbDuplicateCodes, blockedRows }
              : { found: false },

          // Employees — info only, won't block import
          existingEmployees:
            existingEmployeeMap.length > 0
              ? { found: true, employees: existingEmployeeMap }
              : { found: false },

          // Provinces that will be auto-created
          newProvincesToCreate:
            newProvinces.length > 0
              ? { found: true, provinces: newProvinces }
              : { found: false },
        },
      });
    } catch (error) {
      logger.error(`Validate import error: ${error.message}`);
      return res
        .status(500)
        .json({
          success: false,
          message: "Internal server error during validation.",
        });
    }
  };

  downloadTemplate = async (req, res) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Depots");

    worksheet.columns = [
      { header: "DepotEnglishsname", key: "name", width: 25 },
      { header: "DepotsKhmername", key: "khmerName", width: 25 },
      { header: "Depotcode", key: "code", width: 15 },
      { header: "DepotPhone", key: "phone", width: 15 },
      { header: "provinceName", key: "provinceName", width: 20 },
      { header: "districtName", key: "districtName", width: 20 },
      { header: "SaleSupervisorName", key: "employeeName", width: 25 },
      { header: "SaleSupervisorEmail", key: "employeeEmail", width: 25 },
      { header: "SaleSupervisorPhone", key: "employeePhone", width: 20 },
      { header: "SaleSupervisorKhmerName", key: "employeeKhmerName", width: 25 },
      { header: "address", key: "address", width: 30 },
      { header: "brandCode", key: "brandCode", width: 15 },
      { header: "status", key: "status", width: 15 },
      { header: "DEPO ID Number", key: "depotNumber", width: 18 },
      { header: "DOB", key: "dob", width: 20 },
      { header: "Sex", key: "sex", width: 15 },
      { header: "Expired Date", key: "expiryDate", width: 20 },
    ];

    // ─── Header style ─────────────
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2F5597" } };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.height = 28;

    // ─── Sample rows (matching your data) ──────
    const samples = [
      {
        name: "Depot A",
        khmerName: "ឃ្លាំងក",
        code: "WH-001",
        phone: "023123456",
        provinceName: "Phnom Penh",
        districtName: "Chamkar Mon",
        employeeName: "Sok Chea",
        employeeEmail: "sok@example.com",
        employeePhone: "012345678",
        employeeKhmerName: "សុខ ជា",
        address: "ភូមិបី សង្កាត់ទួលស្វាយព្រៃ1 ខណ្ឌចំការមន រាជធានីភ្នំពេញ",
        brandCode: "GB-001",
        status: "active",
        depotNumber: "010146722 (01)",
        dob: "18/Aug/1962",
        sex: "M",
        expiryDate: "15/Jul/2025",
      },
      {
        name: "Depot B",
        khmerName: "ឃ្លាំងខ",
        code: "WH-002",
        phone: "023123457",
        provinceName: "Phnom Penh",
        districtName: "Chamkar Mon",
        employeeName: "Chan Dara",
        employeeEmail: "chan@example.com",
        employeePhone: "012345679",
        employeeKhmerName: "ច័ន្ទ ដារ៉ា",
        address: "ភូមិប្រាំពីរ សង្កាត់ទួលស្វាយព្រៃ2 ខណ្ឌចំការមន រាជធានីភ្នំពេញ",
        brandCode: "GB-002",
        status: "active",
        depotNumber: "010066280 (01)",
        dob: "29/Jun/1967",
        sex: "F",
        expiryDate: "31/Mar/2025",
      },
    ];

    for (const row of samples) {
      worksheet.addRow(row);
    }

    // ─── Instruction row ──────────
    const instructionRow = worksheet.addRow({
      name: "⚠️ Required: name, provinceName, districtName",
      status: "Use 'active' or 'inactive'",
      sex: "Use 'M' or 'F'",
      expiryDate: "Dates: D/MMM/YYYY (e.g., 1/Jan/2026)",
    });
    instructionRow.font = { italic: true, size: 10, color: { argb: "FF999999" } };
    instructionRow.height = 22;

    // ─── Response ────────────────
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="depot_import_template.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  };
}

export default new DepotController();