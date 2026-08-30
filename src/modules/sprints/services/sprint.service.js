import sprintRepository from "../repositories/sprint.repository.js";
import squadRepository from "../../squads/repositories/squad.repository.js";
import squadMemberRepository from "../../squads/repositories/squadMember.repository.js";

import AppError from "../../../shared/errors/AppError.js";

import {
  getPagination,
  buildPagination,
} from "../../../shared/utils/pagination.js";

const VALID_STATUSES = [
  "PLANNED",
  "ACTIVE",
  "COMPLETED",
];

const ALLOWED_TRANSITIONS = {
  PLANNED: ["ACTIVE"],
  ACTIVE: ["COMPLETED"],
  COMPLETED: [],
};

class SprintService {
  // ==========================================
  // ENSURE USER HAS ACCESS TO SQUAD
  // ==========================================

  async ensureSquadAccess(squadId, user) {
    if (!user?.id) {
      throw new AppError(
        "Authentication required",
        401
      );
    }

    // ADMIN has global access
    if (user.role === "ADMIN") {
      return;
    }

    const isMember =
      await squadMemberRepository.isMember(
        squadId,
        user.id
      );

    if (!isMember) {
      throw new AppError(
        "You are not a member of this squad",
        403
      );
    }
  }

  // ==========================================
  // CREATE SPRINT
  // ==========================================

  async create(sprintData) {
    const {
      squadId,
      name,
      startDate,
      endDate,
    } = sprintData;

    // ------------------------------------------
    // REQUIRED FIELDS
    // ------------------------------------------

    if (!squadId) {
      throw new AppError(
        "Squad ID is required",
        400
      );
    }

    if (!name?.trim()) {
      throw new AppError(
        "Sprint name is required",
        400
      );
    }

    if (!startDate || !endDate) {
      throw new AppError(
        "Start date and end date are required",
        400
      );
    }

    // ------------------------------------------
    // CHECK SQUAD
    // ------------------------------------------

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

    // ------------------------------------------
    // CONVERT DATES
    // ------------------------------------------

    const start = new Date(startDate);
    const end = new Date(endDate);

    // ------------------------------------------
    // VALIDATE DATES
    // ------------------------------------------

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

    // ------------------------------------------
    // CHECK OVERLAPPING SPRINT
    // ------------------------------------------

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

    // ------------------------------------------
    // CREATE SPRINT
    // ------------------------------------------

    return await sprintRepository.create({
      squadId,
      name: name.trim(),
      startDate: start,
      endDate: end,
    });
  }

  // ==========================================
  // GET ALL SPRINTS BY SQUAD
  // ==========================================

  async getAllBySquad(
    squadId,
    query = {},
    user
  ) {
    // ------------------------------------------
    // CHECK SQUAD
    // ------------------------------------------

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

    // ------------------------------------------
    // CHECK ACCESS
    // ------------------------------------------

    await this.ensureSquadAccess(
      squadId,
      user
    );

    // ------------------------------------------
    // PAGINATION
    // ------------------------------------------

    const {
      page,
      limit,
      offset,
    } = getPagination(query);

    // ------------------------------------------
    // FILTERS
    // ------------------------------------------

    const filters = {
      status: query.status,
    };

    // ------------------------------------------
    // FETCH SPRINTS
    // ------------------------------------------

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

    // ------------------------------------------
    // TOTAL
    // ------------------------------------------

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

  // ==========================================
  // GET SPRINT BY ID
  // ==========================================

  async getById(id, user) {
    const sprint =
      await sprintRepository.findById(id);

    if (!sprint) {
      throw new AppError(
        "Sprint not found",
        404
      );
    }

    // ------------------------------------------
    // CHECK ACCESS
    // ------------------------------------------

    await this.ensureSquadAccess(
      sprint.squadId,
      user
    );

    return sprint;
  }

  // ==========================================
  // UPDATE SPRINT
  // ==========================================

  async update(id, sprintData) {
    const sprint =
      await sprintRepository.findById(id);

    if (!sprint) {
      throw new AppError(
        "Sprint not found",
        404
      );
    }

    // ------------------------------------------
    // PREVENT UPDATING COMPLETED SPRINT
    // ------------------------------------------

    if (
      sprint.status === "COMPLETED"
    ) {
      throw new AppError(
        "Completed sprint cannot be updated",
        400
      );
    }

    // ------------------------------------------
    // VALIDATE SQUAD IF CHANGED
    // ------------------------------------------

    if (sprintData.squadId) {
      const squad =
        await squadRepository.findById(
          sprintData.squadId
        );

      if (!squad) {
        throw new AppError(
          "Squad not found",
          404
        );
      }
    }

    // ------------------------------------------
    // DETERMINE FINAL VALUES
    // ------------------------------------------

    const squadId =
      sprintData.squadId ||
      sprint.squadId;

    const start = sprintData.startDate
      ? new Date(sprintData.startDate)
      : new Date(sprint.startDate);

    const end = sprintData.endDate
      ? new Date(sprintData.endDate)
      : new Date(sprint.endDate);

    // ------------------------------------------
    // VALIDATE DATES
    // ------------------------------------------

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

    // ------------------------------------------
    // CHECK OVERLAP
    // ------------------------------------------

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

    // ------------------------------------------
    // PREVENT MANUAL STATUS CHANGE HERE
    // ------------------------------------------

    const updateData = {
      ...sprintData,
      squadId,
      startDate: start,
      endDate: end,
      updatedAt: new Date(),
    };

    delete updateData.status;

    // ------------------------------------------
    // CLEAN NAME
    // ------------------------------------------

    if (updateData.name !== undefined) {
      if (!updateData.name?.trim()) {
        throw new AppError(
          "Sprint name cannot be empty",
          400
        );
      }

      updateData.name =
        updateData.name.trim();
    }

    return await sprintRepository.update(
      id,
      updateData
    );
  }

  // ==========================================
  // DELETE SPRINT
  // ==========================================

  async delete(id) {
    const sprint =
      await sprintRepository.findById(id);

    if (!sprint) {
      throw new AppError(
        "Sprint not found",
        404
      );
    }

    // ------------------------------------------
    // PREVENT DELETING ACTIVE SPRINT
    // ------------------------------------------

    if (sprint.status === "ACTIVE") {
      throw new AppError(
        "Active sprint cannot be deleted",
        400
      );
    }

    // ------------------------------------------
    // DELETE
    // ------------------------------------------

    await sprintRepository.delete(id);

    return {
      message:
        "Sprint deleted successfully",
    };
  }

  // ==========================================
  // UPDATE SPRINT STATUS
  // ==========================================

  async updateStatus(id, status) {
    const sprint =
      await sprintRepository.findById(id);

    if (!sprint) {
      throw new AppError(
        "Sprint not found",
        404
      );
    }

    // ------------------------------------------
    // VALIDATE TARGET STATUS
    // ------------------------------------------

    if (!VALID_STATUSES.includes(status)) {
      throw new AppError(
        "Invalid sprint status",
        400
      );
    }

    // ------------------------------------------
    // VALIDATE CURRENT STATUS
    // ------------------------------------------

    const allowedTransitions =
      ALLOWED_TRANSITIONS[sprint.status];

    if (!allowedTransitions) {
      throw new AppError(
        `Invalid current sprint status: ${sprint.status}`,
        400
      );
    }

    // ------------------------------------------
    // VALIDATE TRANSITION
    // ------------------------------------------

    if (
      !allowedTransitions.includes(status)
    ) {
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

    // ------------------------------------------
    // UPDATE STATUS
    // ------------------------------------------

    return await sprintRepository.update(
      id,
      {
        status,
        updatedAt: new Date(),
      }
    );
  }
}

export default new SprintService();