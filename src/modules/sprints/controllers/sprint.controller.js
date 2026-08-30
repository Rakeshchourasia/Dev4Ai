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
  async updateStatus(id, status) {
    const sprint =
      await sprintRepository.findById(id);

    if (!sprint) {
      throw new AppError(
        "Sprint not found",
        404
      );
    }

    const allowedTransitions = {
      PLANNED: ["ACTIVE"],
      ACTIVE: ["COMPLETED"],
      COMPLETED: [],
    };

    const allowed =
      allowedTransitions[sprint.status];

    if (!allowed) {
      throw new AppError(
        `Invalid current sprint status: ${sprint.status}`,
        400
      );
    }

    if (!allowed.includes(status)) {
      throw new AppError(
        `Cannot change sprint status from ${sprint.status} to ${status}`,
        400
      );
    }

    // ------------------------------------------
    // ONLY ONE ACTIVE SPRINT PER SQUAD
    // ------------------------------------------

    if (status === "ACTIVE") {
      const activeSprint =
        await sprintRepository.findActiveSprintBySquadId(
          sprint.squadId,
          sprint.id
        );

      if (activeSprint) {
        throw new AppError(
          "Another sprint is already active for this squad",
          409
        );
      }
    }

    return await sprintRepository.update(
      id,
      {
        status,
        updatedAt: new Date(),
      }
    );
  }

}

export default new SprintController();