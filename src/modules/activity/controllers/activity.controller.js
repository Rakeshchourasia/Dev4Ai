import activityService from "../services/activity.service.js";

class ActivityController {
  async getTicketActivity(req, res, next) {
    try {
      const activities =
        await activityService.getTicketActivity(
          req.params.ticketId
        );

      return res.status(200).json({
        success: true,
        data: activities,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSquadActivity(req, res, next) {
    try {
      const activities =
        await activityService.getSquadActivity(
          req.params.squadId
        );

      return res.status(200).json({
        success: true,
        data: activities,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSprintActivity(req, res, next) {
    try {
      const activities =
        await activityService.getSprintActivity(
          req.params.sprintId
        );

      return res.status(200).json({
        success: true,
        data: activities,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ActivityController();
