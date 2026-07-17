import { kpiSystemService } from "../services/kpiSystemService.js";

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
}

export default new KpiSystemController();
