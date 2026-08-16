import sprintService from "../services/sprint.service.js";

class SprintController {
  async create(req, res, next) {
    try {
      const sprint = await sprintService.create(req.body);

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

      const sprints = await sprintService.getAllBySquad(
        squadId
      );

      return res.status(200).json({
        success: true,
        message: "Sprints fetched successfully",
        data: sprints,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const sprint = await sprintService.getById(
        req.params.id
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
        req.body
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

  async delete(req, res, next) {
    try {
      const result = await sprintService.delete(
        req.params.id
      );

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
async updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const sprint = await sprintService.updateStatus(
      id,
      status
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

}

export default new SprintController();