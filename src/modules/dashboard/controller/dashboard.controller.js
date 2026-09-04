import dashboardService from "../services/dashboard.service.js";

class DashboardController {
  // ==========================================
  // GET SQUAD DASHBOARD
  // ==========================================

  async getSquadDashboard(req, res, next) {
    try {
      const dashboard =
        await dashboardService.getSquadDashboard(
          req.params.squadId,
          req.user
        );

      return res.status(200).json({
        success: true,
        message: "Squad dashboard fetched successfully",
        data: dashboard,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // GET SPRINT DASHBOARD
  // ==========================================

  async getSprintDashboard(req, res, next) {
    try {
      const dashboard =
        await dashboardService.getSprintDashboard(
          req.params.sprintId,
          req.user
        );

      return res.status(200).json({
        success: true,
        message: "Sprint dashboard fetched successfully",
        data: dashboard,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new DashboardController();