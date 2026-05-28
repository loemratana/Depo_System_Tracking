import dashboardKpi from "../services/report/dashboardKpi.js";
class DashboardController {
  getDashboardKpisHandler = async (req, res, next) => {
    try {
      const kpis = await dashboardKpi.getDashboardKpis();
      res.status(200).json({
        success: true,
        data: kpis,
      });
    } catch (error) {
      console.error("Error fetching dashboard KPIs:", error);
      next(error);
    }
  };

  getAssignmentTrend = async (req, res, next) => {
    try {
      const trend = await dashboardKpi.getMonthlyAssignmentTrend();
      res.status(200).json({
        success: true,
        data: trend,
      });
    } catch (error) {
      console.error('Error fetching assignment trend:', error);
      next(error);
    }
  };
}
export default new DashboardController();