import { assessmentService } from "../services/assessmentService.js";
import { AssessmentExcelExporter } from "../exporters/assessment-excel.exporter.js";

class AssessmentController {
  // ── Cycles ─────────────────────────────────────────────

  listCycles = async (req, res, next) => {
    try {
      const data = await assessmentService.listCycles();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  createCycle = async (req, res, next) => {
    try {
      const { type, label, periodStart, periodEnd } = req.body;
      if (!type || !label || !periodStart || !periodEnd) {
        return res.status(400).json({
          success: false,
          message: "type, label, periodStart, and periodEnd are required",
        });
      }
      const data = await assessmentService.createCycle({
        type,
        label,
        periodStart,
        periodEnd,
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  // ── Criteria ───────────────────────────────────────────

  listCriteria = async (req, res, next) => {
    try {
      const includeInactive = req.query.includeInactive === "true";
      const data = await assessmentService.listCriteria({ includeInactive });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  // ── Assessments ────────────────────────────────────────

  listAssessments = async (req, res, next) => {
    try {
      const result = await assessmentService.listAssessments(req.query);
      // ?groupBy=brand|province|district returns { groups, totalAssessments }
      // instead of the flat { data, pagination } page.
      if (result.groups) {
        return res.json({
          success: true,
          groupBy: result.groupBy,
          groups: result.groups,
          totalAssessments: result.totalAssessments,
        });
      }
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  };

  // Same filters as listAssessments (brandId/provinceId/districtId
  // included), no pagination — every matching row goes into one sheet.
  exportAssessments = async (req, res, next) => {
    try {
      const assessments = await assessmentService.exportAssessments(
        req.query,
      );
      const exporter = new AssessmentExcelExporter({ assessments });
      const buffer = await exporter.export();
      res.setHeader("Content-Type", exporter.getContentType());
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${exporter.getFileName()}"`,
      );
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };

  getAssessment = async (req, res, next) => {
    try {
      const data = await assessmentService.getAssessmentById(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  getPreviousAssessment = async (req, res, next) => {
    try {
      const assessment = await assessmentService.getAssessmentById(
        req.params.id,
      );
      const data = await assessmentService.getPreviousAssessment(assessment);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  createAssessment = async (req, res, next) => {
    try {
      const { depotId, cycleId, assessmentDate, evaluatorName } = req.body;
      if (!depotId || !cycleId || !assessmentDate) {
        return res.status(400).json({
          success: false,
          message: "depotId, cycleId, and assessmentDate are required",
        });
      }
      const data = await assessmentService.createAssessment({
        depotId,
        cycleId,
        assessmentDate,
        evaluatorId: req.user.id,
        // Free-typed name of whoever actually performed the evaluation
        // (may not have a login of their own); falls back to the account
        // username when not given.
        evaluatorName,
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  updateAssessment = async (req, res, next) => {
    try {
      const { evaluatorName, assessmentDate } = req.body;
      const data = await assessmentService.updateAssessment(
        req.params.id,
        { evaluatorName, assessmentDate },
        req.user.id,
        req.user.role,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  updateItems = async (req, res, next) => {
    try {
      const items = req.body?.items;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "body.items must be a non-empty array",
        });
      }
      const data = await assessmentService.updateItems(
        req.params.id,
        items,
        req.user.id,
        req.user.role,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  submitAssessment = async (req, res, next) => {
    try {
      const data = await assessmentService.submitAssessment(
        req.params.id,
        req.user.id,
      );
      res.json({ success: true, message: "Assessment submitted", data });
    } catch (error) {
      next(error);
    }
  };

  finalizeAssessment = async (req, res, next) => {
    try {
      const data = await assessmentService.finalizeAssessment(
        req.params.id,
        req.user.id,
      );
      res.json({ success: true, message: "Assessment finalized", data });
    } catch (error) {
      next(error);
    }
  };

  reopenAssessment = async (req, res, next) => {
    try {
      const data = await assessmentService.reopenAssessment(req.params.id, {
        reason: req.body?.reason,
        actorId: req.user.id,
      });
      res.status(201).json({
        success: true,
        message: "Assessment reopened as a new draft version",
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteAssessment = async (req, res, next) => {
    try {
      const data = await assessmentService.deleteAssessment(req.params.id);
      res.json({ success: true, message: "Assessment deleted", data });
    } catch (error) {
      next(error);
    }
  };
}

export default new AssessmentController();
