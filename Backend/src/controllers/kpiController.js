import dashboardKpi from "../services/report/dashboardKpi.js";
import { brandMonthlyKpiService } from "../services/brandMonthlyKpiService.js";
class DashboardController {
  getDashboardKpisHandler = async (req, res, next) => {
    try {
      const kpis = await dashboardKpi.getDashboardKpis();
      res.status(200).json({
        success: true,
        data: kpis,
      });
    } catch (error) {
      next(error);
    }
  };

  getAssignmentTrend = async (req, res, next) => {
    try {
      const { brandId, year, month, months } = req.query;
      const trend = await dashboardKpi.getMonthlyPoTrend({
        brandId,
        year,
        month,
        months,
      });
      res.status(200).json({
        success: true,
        data: trend,
      });
    } catch (error) {
      next(error);
    }
  };

  getBrandDistribution = async (req, res, next) => {
    try {
      const { year, month } = req.query;
      const data = await dashboardKpi.getBrandDistribution({ year, month });
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  getBrandMonthlyReport = async (req, res, next) => {
    try {
      const data = await brandMonthlyKpiService.getBrandMonthlyReport(
        req.query,
      );
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  getBrandYearlyReport = async (req, res, next) => {
    try {
      const data = await brandMonthlyKpiService.getBrandYearlyReport(req.query);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  getDashboardBrand = async (req, res, next) => {
    try {
      const data = await brandMonthlyKpiService.getDashboardBrand(req.query);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  getDashboardInsights = async (req, res, next) => {
    try {
      const data = await brandMonthlyKpiService.getDashboardInsights(req.query);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  getPoPerformanceTrend = async (req, res, next) => {
    try {
      const { from, to, brandId, depotId, ownerId, provinceId } = req.query;
      const data = await dashboardKpi.getPoPerformanceTrend({
        from,
        to,
        brandId,
        depotId,
        ownerId,
        provinceId,
      });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}
export default new DashboardController();
