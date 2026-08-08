import { kpiSystemService } from "../services/kpiSystemService.js";
import {
  backfillKpiValuesFromEmployeeKpi,
  seedKpiCatalog,
} from "../services/kpiCatalog.js";
import { prisma } from "../config/db.js";
import { brandMonthlyKpiService } from "../services/brandMonthlyKpiService.js";

class KpiSystemController {
  getRankings = async (req, res, next) => {
    try {
      const data = await kpiSystemService.getRankings(req.query);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  getSummary = async (req, res, next) => {
    try {
      const data = await kpiSystemService.getSummary(req.query);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  getMatrix = async (req, res, next) => {
    try {
      const data = await kpiSystemService.getMatrix(req.query);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  getFilterOptions = async (req, res, next) => {
    try {
      const data = await kpiSystemService.getFilterOptions();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  listDefinitions = async (req, res, next) => {
    try {
      const data = await kpiSystemService.listDefinitions();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  getWideMonth = async (req, res, next) => {
    try {
      const data = await kpiSystemService.getWideMonth(req.query);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  setTarget = async (req, res, next) => {
    try {
      const { employeeId, depotId, month, targetQty } = req.body;
      if (!employeeId || !depotId || !month || targetQty === undefined) {
        return res.status(400).json({
          success: false,
          message: "employeeId, depotId, month, and targetQty are required",
        });
      }

      const data = await kpiSystemService.setTarget({
        employeeId,
        depotId,
        month,
        targetQty,
      });

      res.status(201).json({
        success: true,
        message: "KPI target saved",
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  importMonthly = async (req, res, next) => {
    try {
      const rows = req.body?.rows;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "body.rows must be a non-empty array",
        });
      }

      const result = await kpiSystemService.importMonthlyRows({
        fileName: req.body.fileName || "upload.json",
        rows,
        uploadedBy: req.user?.id || null,
      });

      res.status(201).json({
        success: true,
        message:
          result.batch.status === "success"
            ? `Imported ${result.importedRows} row(s)`
            : `Imported ${result.importedRows} row(s), ${result.failedRows} failed`,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  listBrandMonthly = async (req, res, next) => {
    try {
      const result = await brandMonthlyKpiService.listMonthlyKpis(req.query);
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  upsertBrandMonthly = async (req, res, next) => {
    try {
      const data = await brandMonthlyKpiService.upsertMonthlyKpi(req.body);
      res.status(201).json({
        success: true,
        message: "Monthly KPI saved",
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  importBrandMonthly = async (req, res, next) => {
    try {
      let rows = req.body?.rows;
      if (req.file?.buffer) {
        rows = await brandMonthlyKpiService.parseMonthlyWorkbook(
          req.file.buffer,
        );
      }
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Provide an Excel file or body.rows",
        });
      }
      const result = await brandMonthlyKpiService.importMonthlyRows({ rows });
      res.status(201).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  downloadBrandMonthlyTemplate = async (req, res, next) => {
    try {
      if (!req.query.brandId) {
        return res.status(400).json({
          success: false,
          message: "brandId is required",
        });
      }
      const buffer = await brandMonthlyKpiService.generateMonthlyTemplate(
        req.query,
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=depot_monthly_kpi_template_${req.query.brandId}_${req.query.month || new Date().toISOString().slice(0, 7)}.xlsx`,
      );
      res.send(Buffer.from(buffer));
    } catch (error) {
      next(error);
    }
  };

  exportBrandMonthly = async (req, res, next) => {
    try {
      const buffer = await brandMonthlyKpiService.exportMonthlyWorkbook(
        req.query,
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=depot_monthly_kpi_${req.query.brandId || "all"}_${req.query.month || new Date().toISOString().slice(0, 7)}.xlsx`,
      );
      res.send(Buffer.from(buffer));
    } catch (error) {
      next(error);
    }
  };

  setBrandTarget = async (req, res, next) => {
    try {
      const { depotId, brandId, month, targetPo } = req.body;
      if (!depotId || !brandId || !month || targetPo === undefined) {
        return res.status(400).json({
          success: false,
          message: "depotId, brandId, month, and targetPo are required",
        });
      }
      const data = await brandMonthlyKpiService.setBrandTarget({
        depotId,
        brandId,
        month,
        targetPo,
      });
      res.status(201).json({
        success: true,
        message: "Brand KPI target saved",
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  downloadBrandTargetTemplate = async (req, res, next) => {
    try {
      if (!req.query.brandId) {
        return res.status(400).json({
          success: false,
          message: "brandId is required",
        });
      }
      const buffer = await brandMonthlyKpiService.generateTargetTemplate(
        req.query,
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=brand_target_template_${req.query.brandId}_${req.query.month || new Date().toISOString().slice(0, 7)}.xlsx`,
      );
      res.send(Buffer.from(buffer));
    } catch (error) {
      next(error);
    }
  };

  importBrandTargets = async (req, res, next) => {
    try {
      let rows = req.body?.rows;
      if (req.file?.buffer) {
        rows = await brandMonthlyKpiService.parseTargetWorkbook(
          req.file.buffer,
        );
      }
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Provide an Excel file or body.rows",
        });
      }
      const result = await brandMonthlyKpiService.importTargetRows({ rows });
      res.status(201).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  seedCatalog = async (req, res, next) => {
    try {
      const catalog = await seedKpiCatalog(prisma);
      const backfill = await backfillKpiValuesFromEmployeeKpi(prisma);
      res.json({
        success: true,
        message: "KPI catalog seeded and legacy rows backfilled",
        catalog: {
          definitions: catalog.definitions.length,
          pack: catalog.pack.code,
        },
        backfill,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new KpiSystemController();
