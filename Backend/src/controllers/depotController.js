import depotService from '../services/depotService.js';
import { normalizeImportRow, tryParseImportDate, normalizeSex, isEmptyOptional } from "../utils/importUtils.js";
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

function cellToString(value) {
  if (value == null) return "";
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "object") {
    if ("result" in value && value.result != null) return cellToString(value.result);
    if ("text" in value) return String(value.text);
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
  }
  return String(value).trim();
}

async function parseExcelDepots(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet(1);
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const headers = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = cellToString(cell.value);
  });

  const records = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record = {};
    let hasValue = false;
    headers.forEach((header, colNumber) => {
      if (!header) return;
      const value = cellToString(row.getCell(colNumber).value);
      if (value) hasValue = true;
      record[header] = value;
    });
    // Skip blank / instruction-only trailing rows
    if (!hasValue) return;
    const nameHint = Object.values(record).join(" ").toLowerCase();
    if (nameHint.includes("required:") || nameHint.includes("⚠️")) return;
    records.push(record);
  });

  return records;
}

function isExcelUpload(file) {
  const name = (file.originalname || "").toLowerCase();
  const type = (file.mimetype || "").toLowerCase();
  return (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    type.includes("spreadsheet") ||
    type.includes("excel")
  );
}

async function parseDepotImportFile(file) {
  if (isExcelUpload(file)) {
    return parseExcelDepots(file.buffer);
  }
  return parseCSV(file.buffer);
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
      const { brandId, brandIds, provinceId } = req.query;
      const parsedBrandIds = brandIds
        ? String(brandIds)
            .split(",")
            .map((id) => parseInt(id.trim(), 10))
            .filter((id) => !isNaN(id))
        : undefined;

      const summary = await depotService.getDepotSummary({
        brandId: brandId ? parseInt(brandId, 10) : undefined,
        brandIds: parsedBrandIds?.length ? parsedBrandIds : undefined,
        provinceId: provinceId ? parseInt(provinceId, 10) : undefined,
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

  uploadOwnerPhoto = async (req, res) => {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }
      const depot = await depotService.uploadOwnerPhoto(req.params.id, req.file.buffer);
      res.json({ success: true, data: depot, message: "Owner photo uploaded successfully" });
    } catch (error) {
      logger.error(`Error uploading owner photo: ${error.message}`);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  removeOwnerPhoto = async (req, res) => {
    try {
      const depot = await depotService.removeOwnerPhoto(req.params.id);
      res.json({ success: true, data: depot, message: "Owner photo removed successfully" });
    } catch (error) {
      logger.error(`Error removing owner photo: ${error.message}`);
      res.status(500).json({ success: false, message: error.message });
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
   * Expects multipart/form-data with field "file" (.xlsx template or .csv)
   *
   * Required columns : name / DepotEnglishsname, provinceName, districtName
   */
  bulkImport = async (req, res) => {
    try {
      // multer middleware (upload.single('file')) runs before this handler
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            'No file uploaded. Send an Excel (.xlsx) or CSV file with field name "file".',
        });
      }

      // ── 1. Parse Excel or CSV ─────────────────────────────────────────────
      let records;
      try {
        records = await parseDepotImportFile(req.file);
      } catch (parseErr) {
        return res.status(400).json({
          success: false,
          message: `File parse error: ${parseErr.message}. Use the downloaded .xlsx template (or a UTF-8 CSV).`,
        });
      }

      if (records.length === 0) {
        return res.status(400).json({
          success: false,
          message: "File is empty or has no data rows.",
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

  /**
   * POST /api/depots/verify
   * Multipart file upload — parse + validate, return preview rows
   * (same shape as employees/provinces verify for the admin preview page).
   */
  verifyDepotFile = async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded. Send an Excel (.xlsx) or CSV with field "file".',
        });
      }

      let records;
      try {
        records = await parseDepotImportFile(req.file);
      } catch (parseErr) {
        return res.status(400).json({
          success: false,
          message: `File parse error: ${parseErr.message}. Use the downloaded .xlsx template.`,
        });
      }

      if (!records.length) {
        return res.status(400).json({
          success: false,
          message: "File is empty or has no data rows.",
        });
      }

      const normalizedRows = records.map((raw) => normalizeImportRow({ ...raw }));

      const brandCodes = [
        ...new Set(
          normalizedRows.map((r) => r.brandCode?.trim()).filter(Boolean),
        ),
      ];
      const brandNames = [
        ...new Set(
          normalizedRows.map((r) => r.brandName?.trim()).filter(Boolean),
        ),
      ];
      const brandWhere = [];
      if (brandCodes.length) {
        brandWhere.push({ code: { in: brandCodes, mode: "insensitive" } });
      }
      if (brandNames.length) {
        brandWhere.push({ name: { in: brandNames, mode: "insensitive" } });
      }
      const brands =
        brandWhere.length > 0
          ? await prisma.brand.findMany({ where: { OR: brandWhere } })
          : [];
      const brandKeySet = new Set();
      for (const b of brands) {
        if (b.code) brandKeySet.add(b.code.toLowerCase());
        if (b.name) brandKeySet.add(b.name.toLowerCase());
      }

      const seenCodes = new Map();
      const validRows = [];
      const invalidRows = [];

      for (const [i, row] of normalizedRows.entries()) {
        const rowNumber = i + 2; // header is row 1
        const errors = [];
        const previewData = {
          name: row.name || "",
          khmerName: row.khmerName || "",
          code: row.code || "",
          phone: row.phone || "",
          provinceName: row.provinceName || "",
          districtName: row.districtName || "",
          employeeName: row.employeeName || "",
          employeeEmail: row.employeeEmail || "",
          brandCode: row.brandCode || "",
          status: row.status || "",
          depotNumber: row.depotNumber || "",
          dob: row.dob || "",
          sex: row.sex || "",
          expiryDate: row.expiryDate || "",
          address: row.address || "",
        };

        if (!String(row.name || "").trim()) {
          errors.push("Owner name (DepotEnglishsname) is required");
        }
        if (!String(row.provinceName || "").trim()) {
          errors.push("provinceName is required");
        }
        if (!String(row.districtName || "").trim()) {
          errors.push("districtName is required");
        }

        if (row.status) {
          const status = String(row.status).trim().toLowerCase();
          if (!["active", "inactive", "vacancy", "expired"].includes(status)) {
            errors.push(
              `status must be active, inactive, vacancy, or expired (got "${row.status}")`,
            );
          }
        }

        if (
          row.employeeEmail &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(row.employeeEmail).trim())
        ) {
          errors.push(`employeeEmail "${row.employeeEmail}" is not valid`);
        }

        // DOB / Expiry / Sex are optional — invalid or placeholder values become null (no error)
        if (!isEmptyOptional(row.dob) && !tryParseImportDate(row.dob)) {
          row.dob = "";
        }
        if (!isEmptyOptional(row.expiryDate) && !tryParseImportDate(row.expiryDate)) {
          row.expiryDate = "";
        }
        if (!isEmptyOptional(row.sex) && !normalizeSex(row.sex)) {
          row.sex = "";
        }

        const brandCode = row.brandCode?.trim();
        const brandName = row.brandName?.trim();
        if (brandCode && !brandKeySet.has(brandCode.toLowerCase())) {
          errors.push(
            `Brand code "${brandCode}" not found — use an existing brand code from Brands`,
          );
        } else if (
          !brandCode &&
          brandName &&
          !brandKeySet.has(brandName.toLowerCase())
        ) {
          errors.push(
            `Brand name "${brandName}" not found — use an existing brand`,
          );
        }

        const code = row.code?.trim();
        if (code) {
          if (seenCodes.has(code)) {
            errors.push(
              `Duplicate code "${code}" in file (also on row ${seenCodes.get(code)})`,
            );
          } else {
            seenCodes.set(code, rowNumber);
          }
        }

        if (errors.length > 0) {
          invalidRows.push({ rowNumber, errors, data: previewData });
        } else {
          validRows.push({ rowNumber, data: previewData });
        }
      }

      return res.json({
        success: true,
        message: `Verified ${normalizedRows.length} row(s)`,
        summary: {
          totalRows: validRows.length + invalidRows.length,
          validCount: validRows.length,
          invalidCount: invalidRows.length,
        },
        validRows,
        invalidRows,
        canImport: invalidRows.length === 0 && validRows.length > 0,
      });
    } catch (error) {
      logger.error(`Verify depot import error: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to verify depot import file",
      });
    }
  };

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
        const validStatuses = ["active", "inactive", "vacancy", "expired"];
        if (row.status && !validStatuses.includes(row.status.trim().toLowerCase())) {
          errors.push(`status must be "active", "inactive", "vacancy", or "expired", got "${row.status}"`);
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
    try {
      const brands = await prisma.brand.findMany({
        where: { code: { not: null } },
        select: { code: true, name: true, status: true },
        orderBy: { code: "asc" },
      });
      const brandCodes = brands
        .map((b) => b.code?.trim())
        .filter(Boolean);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Depots");

      // Hidden sheet holding allowed list values for dropdowns
      const listsSheet = workbook.addWorksheet("Lists");
      listsSheet.state = "veryHidden";
      listsSheet.getCell("A1").value = "status";
      listsSheet.getCell("A2").value = "active";
      listsSheet.getCell("A3").value = "inactive";
      listsSheet.getCell("A4").value = "vacancy";
      listsSheet.getCell("A5").value = "expired";
      listsSheet.getCell("B1").value = "sex";
      listsSheet.getCell("B2").value = "male";
      listsSheet.getCell("B3").value = "female";
      listsSheet.getCell("B4").value = "other";

      listsSheet.getCell("C1").value = "brandCode";
      if (brandCodes.length === 0) {
        listsSheet.getCell("C2").value = "";
      } else {
        brandCodes.forEach((code, i) => {
          listsSheet.getCell(`C${i + 2}`).value = code;
        });
      }

      // Readable reference: brand code → name
      const brandRef = workbook.addWorksheet("BrandCodes");
      brandRef.columns = [
        { header: "brandCode", key: "code", width: 18 },
        { header: "brandName", key: "name", width: 28 },
        { header: "status", key: "status", width: 12 },
      ];
      brandRef.getRow(1).font = { bold: true };
      brands.forEach((b) => {
        brandRef.addRow({
          code: b.code,
          name: b.name,
          status: b.status || "",
        });
      });

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
    const sampleBrand = brandCodes[0] || "";

    // ─── Sample rows ──────
    const samples = [
      {
        name: "Depot A",
        khmerName: "ឃ្លាំងក",
        code: "WH-SAMPLE-001",
        phone: "023123456",
        provinceName: "Phnom Penh",
        districtName: "Chamkar Mon",
        employeeName: "Sok Chea",
        employeeEmail: "sok@example.com",
        employeePhone: "012345678",
        employeeKhmerName: "សុខ ជា",
        address: "ភូមិបី សង្កាត់ទួលស្វាយព្រៃ1 ខណ្ឌចំការមន រាជធានីភ្នំពេញ",
        brandCode: sampleBrand,
        status: "active",
        depotNumber: "010146722 (01)",
        dob: "18/Aug/1962",
        sex: "male",
        expiryDate: "15/Jul/2025",
      },
      {
        name: "Depot B",
        khmerName: "ឃ្លាំងខ",
        code: "WH-SAMPLE-002",
        phone: "023123457",
        provinceName: "Phnom Penh",
        districtName: "Chamkar Mon",
        employeeName: "Chan Dara",
        employeeEmail: "chan@example.com",
        employeePhone: "012345679",
        employeeKhmerName: "ច័ន្ទ ដារ៉ា",
        address: "ភូមិប្រាំពីរ សង្កាត់ទួលស្វាយព្រៃ2 ខណ្ឌចំការមន រាជធានីភ្នំពេញ",
        brandCode: sampleBrand,
        status: "active",
        depotNumber: "010066280 (01)",
        dob: "29/Jun/1967",
        sex: "female",
        expiryDate: "31/Mar/2025",
      },
    ];

    for (const row of samples) {
      worksheet.addRow(row);
    }

    // Columns: L brandCode, M status, P Sex
    const dropdownRows = 1000;
    const brandListEnd = Math.max(brandCodes.length + 1, 2);

    worksheet.dataValidations.add(`L2:L${dropdownRows}`, {
      type: "list",
      allowBlank: true,
      formulae: [`Lists!$C$2:$C$${brandListEnd}`],
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid brand code",
      error:
        brandCodes.length > 0
          ? "Please select a brand code from the list (see BrandCodes sheet)"
          : "No brand codes found — add brands first",
      showInputMessage: true,
      promptTitle: "Brand code",
      prompt: "Select an existing brand code (or leave blank)",
    });

    worksheet.dataValidations.add(`M2:M${dropdownRows}`, {
      type: "list",
      allowBlank: true,
      formulae: ["Lists!$A$2:$A$5"],
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid status",
      error: "Please select: active, inactive, vacancy, or expired",
      showInputMessage: true,
      promptTitle: "Status",
      prompt: "Select depot status",
    });

    worksheet.dataValidations.add(`P2:P${dropdownRows}`, {
      type: "list",
      allowBlank: true,
      formulae: ["Lists!$B$2:$B$4"],
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid sex",
      error: "Please select: male, female, or other",
      showInputMessage: true,
      promptTitle: "Sex",
      prompt: "Select sex",
    });

    for (let r = 2; r <= 3; r++) {
      for (const col of ["L", "M", "P"]) {
        worksheet.getCell(`${col}${r}`).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE8F0FE" },
        };
      }
    }

    const instructionRow = worksheet.addRow({
      name: "⚠️ Required: DepotEnglishsname, provinceName, districtName",
      brandCode:
        brandCodes.length > 0
          ? "Use dropdown (existing brand codes)"
          : "No brands in DB — create brands first",
      status: "Use dropdown: active | inactive | vacancy | expired",
      sex: "Use dropdown: male | female | other",
      expiryDate: "Dates: D/MMM/YYYY (e.g. 1/Jan/2026)",
    });
    instructionRow.font = { italic: true, size: 10, color: { argb: "FF999999" } };
    instructionRow.height = 22;

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
    } catch (error) {
      logger.error(`Download depot template error: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: "Failed to download depot template",
        error: error.message,
      });
    }
  };
}

export default new DepotController();
