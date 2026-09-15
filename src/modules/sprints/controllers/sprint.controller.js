import sprintService from "../services/sprint.service.js";

class SprintController {
  async create(req, res, next) {
    try {
      const sprint = await sprintService.create(req.body, req.user);

      return res.status(201).json({
        success: true,
        message: "Sprint created successfully",
        data: sprint,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllBySquad(req, res, next) {
    try {
      const { squadId } = req.params;

      const result =
        await sprintService.getAllBySquad(
          squadId,
          req.query,
          req.user
        );

      return res.status(200).json({
        success: true,
        message: "Sprints fetched successfully",
        data: result.sprints,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const sprint =
        await sprintService.getById(
          req.params.id,
          req.user
        );

      return res.status(200).json({
        success: true,
        message: "Sprint fetched successfully",
        data: sprint,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const sprint = await sprintService.update(
        req.params.id,
        req.body,
        req.user
      );

      return res.status(200).json({
        success: true,
        message: "Sprint updated successfully",
        data: sprint,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const sprint = await sprintService.updateStatus(
        req.params.id,
        req.body.status,
        req.user
      );

      return res.status(200).json({
        success: true,
        message: "Sprint status updated successfully",
        data: sprint,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await sprintService.delete(
        req.params.id,
        req.user
      );

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new SprintController();