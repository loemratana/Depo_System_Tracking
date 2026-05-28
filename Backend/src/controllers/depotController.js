import depotService from '../services/depotService.js';
import logger from '../config/logger.js';
import multer from "multer";
import fs from "fs";
import { parse } from "csv-parse";
import { prisma } from '../config/db.js';


const upload = multer({ dest: "uploads/" });
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
          message: 'CSV file is empty or has no data rows.',
        });
      }

      console.log(`[BulkImport] Parsed ${records.length} rows from "${req.file.originalname}"`);

      // ── 2. Process rows via service ───────────────────────────────────────
      const { results, errors } = await depotService.bulkCreateDepots(records);

      console.log(`[BulkImport] Done — ${results.length} created, ${errors.length} failed`);

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
      console.error('[BulkImport] Unexpected error:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during bulk import.',
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

  // Inside DepotController class, add this method:

  validateDepotImport = async (req, res) => {
    try {
      const rows = req.body; // array of CSV row objects

      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Send an array of CSV rows to validate.' });
      }

      // ── 1. Per-row structural validation (no DB needed) ───────────────────
      const rowErrors = [];

      for (const [i, row] of rows.entries()) {
        const rowNumber = i + 1;
        const issues = [];

        if (!row.name?.trim()) issues.push('name is required');
        if (!row.provinceName?.trim()) issues.push('provinceName is required');
        if (!row.districtName?.trim()) issues.push('districtName is required');

        const validStatuses = ['active', 'inactive'];
        if (row.status && !validStatuses.includes(row.status.trim().toLowerCase())) {
          issues.push(`status must be "active" or "inactive", got "${row.status}"`);
        }

        if (row.employeeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.employeeEmail.trim())) {
          issues.push(`employeeEmail "${row.employeeEmail}" is not a valid email`);
        }

        if (issues.length > 0) {
          rowErrors.push({ row: rowNumber, data: row, issues });
        }
      }

      // ── 2. Duplicate codes within the CSV itself ──────────────────────────
      const csvCodes = rows.map(r => r.code?.trim()).filter(Boolean);
      const csvDuplicateCodes = csvCodes.filter((code, i) => csvCodes.indexOf(code) !== i);
      const uniqueCsvDuplicates = [...new Set(csvDuplicateCodes)];

      // ── 3. Collect unique values to query DB ──────────────────────────────
      const codes = [...new Set(csvCodes)];
      const employeeNames = [...new Set(rows.map(r => r.employeeName?.trim()).filter(Boolean))];
      const emails = [...new Set(rows.map(r => r.employeeEmail?.trim()).filter(Boolean))];
      const provinceNames = [...new Set(rows.map(r => r.provinceName?.trim()).filter(Boolean))];

      // ── 4. DB checks (all in parallel) ───────────────────────────────────
      const [
        existingDepotCodes,
        existingEmployees,
        existingProvinces,
      ] = await Promise.all([
        // Depot codes already in DB
        codes.length > 0
          ? prisma.depot.findMany({ where: { code: { in: codes } }, select: { code: true } })
          : [],

        // Employees already in DB (by name or email)
        employeeNames.length > 0 || emails.length > 0
          ? prisma.employee.findMany({
            where: {
              OR: [
                ...(employeeNames.length > 0 ? [{ englishName: { in: employeeNames, mode: 'insensitive' } }] : []),
                ...(emails.length > 0 ? [{ email: { in: emails } }] : []),
              ],
            },
            select: { englishName: true, email: true },
          })
          : [],

        // Provinces already in DB (to know which will be auto-created)
        provinceNames.length > 0
          ? prisma.province.findMany({
            where: { name: { in: provinceNames, mode: 'insensitive' } },
            select: { name: true },
          })
          : [],
      ]);

      // ── 5. Build readable summaries ───────────────────────────────────────
      const dbDuplicateCodes = existingDepotCodes.map(d => d.code);
      const allDuplicateCodes = [...new Set([...uniqueCsvDuplicates, ...dbDuplicateCodes])];

      const existingEmployeeMap = existingEmployees.map(e => ({
        englishName: e.englishName,
        email: e.email,
        note: 'Employee already exists — will be linked, not re-created',
      }));

      const existingProvinceNames = existingProvinces.map(p => p.name);
      const newProvinces = provinceNames.filter(
        n => !existingProvinceNames.some(ep => ep.toLowerCase() === n.toLowerCase())
      );

      // Rows that will be blocked (duplicate code in DB)
      const blockedRows = rows
        .map((r, i) => ({ row: i + 1, code: r.code?.trim(), name: r.name?.trim() }))
        .filter(r => r.code && dbDuplicateCodes.includes(r.code));

      // ── 6. Overall readiness ──────────────────────────────────────────────
      const canImport = rowErrors.length === 0 && blockedRows.length === 0 && uniqueCsvDuplicates.length === 0;

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

          // Codes duplicated inside the CSV
          csvDuplicateCodes: uniqueCsvDuplicates.length > 0
            ? { found: true, codes: uniqueCsvDuplicates }
            : { found: false },

          // Codes already in the database
          dbDuplicateCodes: dbDuplicateCodes.length > 0
            ? { found: true, codes: dbDuplicateCodes, blockedRows }
            : { found: false },

          // Employees — info only, won't block import
          existingEmployees: existingEmployeeMap.length > 0
            ? { found: true, employees: existingEmployeeMap }
            : { found: false },

          // Provinces that will be auto-created
          newProvincesToCreate: newProvinces.length > 0
            ? { found: true, provinces: newProvinces }
            : { found: false },
        },
      });

    } catch (error) {
      logger.error(`Validate import error: ${error.message}`);
      return res.status(500).json({ success: false, message: 'Internal server error during validation.' });
    }
  };

  bulkCreateDepots = async (req, res) => { };

  // Download CSV template for bulk import
  downloadTemplate = (req, res) => {
    try {
      const headers = [
        "name",
        "code",
        "provinceName",
        "districtName",
        "employeeName",
        "employeeEmail",
        "employeePhone",
        "employeeKhmerName",
        "address",
        "phone",
        "status",
      ];

      const exampleRow = [
        "North Warehouse",
        "WH-001",
        "Phnom Penh",
        "Daun Penh",
        "Sok Chea",
        "sok@example.com",
        "012345678",
        "សុខ ជា",
        "Street 123",
        "023123456",
        "active",
      ];

      const csvContent = [headers.join(","), exampleRow.join(",")].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="depot_import_template.csv"',
      );
      res.send(csvContent);
    } catch (error) {
      logger.error(`Error generating template: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Error generating template",
      });
    }
  };
}

export default new DepotController();