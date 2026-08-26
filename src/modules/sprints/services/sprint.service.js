import sprintRepository from "../repositories/sprint.repository.js";
import squadRepository from "../../squads/repositories/squad.repository.js";
import AppError from "../../../shared/errors/AppError.js";
import {
  getPagination,
  buildPagination,
} from "../../../shared/utils/pagination.js";

class SprintService {
  async create(sprintData) {
    const {
      squadId,
      name,
      startDate,
      endDate,
    } = sprintData;

    // 1. Validate required fields
    if (!squadId) {
      throw new AppError("Squad ID is required", 400);
    }

    if (!name) {
      throw new AppError("Sprint name is required", 400);
    }

    if (!startDate || !endDate) {
      throw new AppError(
        "Start date and end date are required",
        400
      );
    }

    // 2. Check that the squad exists
    const squad = await squadRepository.findById(squadId);

    if (!squad) {
      throw new AppError("Squad not found", 404);
    }

    // 3. Convert dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 4. Validate dates
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      throw new AppError("Invalid sprint dates", 400);
    }

    if (start >= end) {
      throw new AppError(
        "Start date must be before end date",
        400
      );
    }

    // 5. Check overlapping sprint
    const overlappingSprint =
      await sprintRepository.findOverlappingSprint(
        squadId,
        start,
        end
      );

    if (overlappingSprint) {
      throw new AppError(
        "Sprint dates overlap with an existing sprint",
        409
      );
    }

    // 6. Create sprint
    return await sprintRepository.create({
      squadId,
      name,
      startDate: start,
      endDate: end,
    });
  }

 async getAllBySquad(
  squadId,
  query = {}
) {
  const squad =
    await squadRepository.findById(
      squadId
    );

  if (!squad) {
    throw new AppError(
      "Squad not found",
      404
    );
  }

  const {
    page,
    limit,
    offset,
  } = getPagination(query);

  const filters = {
    status: query.status,
  };

  const sprints =
    await sprintRepository.findAllBySquadId(
      squadId,
      {
        limit,
        offset,
        ...filters,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }
    );

  const total =
    await sprintRepository.countBySquadId(
      squadId,
      filters
    );

  return {
    sprints,
    pagination: buildPagination(
      page,
      limit,
      total
    ),
  };
}
  async getById(id) {
    const sprint = await sprintRepository.findById(id);

    if (!sprint) {
      throw new AppError("Sprint not found", 404);
    }

    return sprint;
  }

  async update(id, sprintData) {
    const sprint = await sprintRepository.findById(id);

    if (!sprint) {
      throw new AppError("Sprint not found", 404);
    }

    // If squadId is being changed, verify the new squad
    if (sprintData.squadId) {
      const squad = await squadRepository.findById(
        sprintData.squadId
      );

      if (!squad) {
        throw new AppError(
          "Squad not found",
          404
        );
      }
    }

    // Use existing values if dates aren't being changed
    const start = sprintData.startDate
      ? new Date(sprintData.startDate)
      : new Date(sprint.startDate);

    const end = sprintData.endDate
      ? new Date(sprintData.endDate)
      : new Date(sprint.endDate);

    const squadId =
      sprintData.squadId || sprint.squadId;

    // Validate dates
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      throw new AppError(
        "Invalid sprint dates",
        400
      );
    }

    if (start >= end) {
      throw new AppError(
        "Start date must be before end date",
        400
      );
    }

    // Check overlapping sprint
    // Exclude the current sprint from the check
    const overlappingSprint =
      await sprintRepository.findOverlappingSprint(
        squadId,
        start,
        end,
        id
      );

    if (overlappingSprint) {
      throw new AppError(
        "Sprint dates overlap with an existing sprint",
        409
      );
    }

    // Update sprint
    return await sprintRepository.update(id, {
      ...sprintData,
      squadId,
      startDate: start,
      endDate: end,
    });
  }

  async delete(id) {
    const sprint = await sprintRepository.findById(id);

    if (!sprint) {
      throw new AppError("Sprint not found", 404);
    }

    await sprintRepository.delete(id);

    return {
      message: "Sprint deleted successfully",
    };
  }

  async updateStatus(id, status) {
    const sprint = await sprintRepository.findById(id);

    if (!sprint) {
      throw new AppError("Sprint not found", 404);
    }

    const allowedTransitions = {
      PLANNED: ["ACTIVE"],
      ACTIVE: ["COMPLETED"],
      COMPLETED: [],
    };

    if (
      !allowedTransitions[sprint.status].includes(status)
    ) {
      throw new AppError(
        `Cannot change sprint status from ${sprint.status} to ${status}`,
        400
      );
    }

    return await sprintRepository.update(id, {
      status,
      updatedAt: new Date(),
    });
  }
}

export default new SprintService();