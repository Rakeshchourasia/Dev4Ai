import { db } from "../../../db/index.js";

import sprintRepository from "../repositories/sprint.repository.js";

import squadRepository from "../../squads/repositories/squad.repository.js";

import squadMemberRepository from "../../squads/repositories/squadMember.repository.js";

import ticketRepository from "../../tickets/repositories/ticket.repository.js";

import activityService from "../../activity/services/activity.service.js";

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

class SprintService {
  // ==========================================
  // SQUAD ACCESS
  // ==========================================

  async ensureSquadAccess(
    squadId,
    user
  ) {
    if (!user?.id) {
      throw new AppError(
        "Authentication required",
        401
      );
    }

    if (
      user.role === "ADMIN"
    ) {
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
  // CREATE
  // ==========================================

  async create(
    sprintData,
    user
  ) {
    const {
      squadId,
      name,
      startDate,
      endDate,
    } = sprintData;

    if (!user?.id) {
      throw new AppError(
        "Authentication required",
        401
      );
    }

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

    if (
      !startDate ||
      !endDate
    ) {
      throw new AppError(
        "Start date and end date are required",
        400
      );
    }

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

    await this.ensureSquadAccess(
      squadId,
      user
    );

    const start =
      new Date(
        startDate
      );

    const end =
      new Date(
        endDate
      );

    if (
      Number.isNaN(
        start.getTime()
      ) ||
      Number.isNaN(
        end.getTime()
      )
    ) {
      throw new AppError(
        "Invalid sprint dates",
        400
      );
    }

    if (
      start >= end
    ) {
      throw new AppError(
        "Start date must be before end date",
        400
      );
    }

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

    return await db.transaction(
      async (tx) => {
        const sprint =
          await sprintRepository.create(
            {
              squadId,

              name:
                name.trim(),

              startDate:
                start,

              endDate:
                end,

              status:
                "PLANNED",
            },
            tx
          );

        await activityService.log(
          {
            userId:
              user.id,

            action:
              "SPRINT_CREATED",

            entityType:
              "SPRINT",

            entityId:
              sprint.id,

            squadId:
              sprint.squadId,

            sprintId:
              sprint.id,

            description:
              `Sprint "${sprint.name}" was created`,
          },
          tx
        );

        return sprint;
      }
    );
  }

  // ==========================================
  // GET ALL BY SQUAD
  // ==========================================

  async getAllBySquad(
    squadId,
    query = {},
    user
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

    await this.ensureSquadAccess(
      squadId,
      user
    );

    const {
      page,
      limit,
      offset,
    } = getPagination(
      query
    );

    const filters = {
      status:
        query.status,
    };

    const sprints =
      await sprintRepository.findAllBySquadId(
        squadId,
        {
          limit,
          offset,

          status:
            filters.status,

          sortBy:
            query.sortBy,

          sortOrder:
            query.sortOrder,
        }
      );

    const total =
      await sprintRepository.countBySquadId(
        squadId,
        filters
      );

    return {
      sprints,

      pagination:
        buildPagination(
          page,
          limit,
          total
        ),
    };
  }

  // ==========================================
  // GET BY ID
  // ==========================================

  async getById(
    id,
    user
  ) {
    const sprint =
      await sprintRepository.findById(
        id
      );

    if (!sprint) {
      throw new AppError(
        "Sprint not found",
        404
      );
    }

    await this.ensureSquadAccess(
      sprint.squadId,
      user
    );

    return sprint;
  }

  // ==========================================
  // UPDATE
  // ==========================================

  async update(
    id,
    sprintData,
    user
  ) {
    if (!user?.id) {
      throw new AppError(
        "Authentication required",
        401
      );
    }

    const sprint =
      await sprintRepository.findById(
        id
      );

    if (!sprint) {
      throw new AppError(
        "Sprint not found",
        404
      );
    }

    await this.ensureSquadAccess(
      sprint.squadId,
      user
    );

    if (
      sprint.status ===
      "COMPLETED"
    ) {
      throw new AppError(
        "Completed sprint cannot be updated",
        400
      );
    }

    const squadId =
      sprintData.squadId ||
      sprint.squadId;

    if (
      sprintData.squadId &&
      sprintData.squadId !==
        sprint.squadId
    ) {
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

      await this.ensureSquadAccess(
        sprintData.squadId,
        user
      );
    }

    const start =
      sprintData.startDate
        ? new Date(
            sprintData.startDate
          )
        : new Date(
            sprint.startDate
          );

    const end =
      sprintData.endDate
        ? new Date(
            sprintData.endDate
          )
        : new Date(
            sprint.endDate
          );

    if (
      Number.isNaN(
        start.getTime()
      ) ||
      Number.isNaN(
        end.getTime()
      )
    ) {
      throw new AppError(
        "Invalid sprint dates",
        400
      );
    }

    if (
      start >= end
    ) {
      throw new AppError(
        "Start date must be before end date",
        400
      );
    }

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

    const updateData = {
      ...sprintData,

      squadId,

      startDate:
        start,

      endDate:
        end,

      updatedAt:
        new Date(),
    };

    if (
      Object.prototype.hasOwnProperty.call(
        updateData,
        "name"
      )
    ) {
      const trimmedName =
        updateData.name?.trim();

      if (!trimmedName) {
        throw new AppError(
          "Sprint name cannot be empty",
          400
        );
      }

      updateData.name =
        trimmedName;
    }

    // Status only through updateStatus()
    delete updateData.status;

    return await db.transaction(
      async (tx) => {
        const updatedSprint =
          await sprintRepository.update(
            id,
            updateData,
            tx
          );

        if (!updatedSprint) {
          throw new AppError(
            "Sprint update failed",
            500
          );
        }

        await activityService.log(
          {
            userId:
              user.id,

            action:
              "SPRINT_UPDATED",

            entityType:
              "SPRINT",

            entityId:
              updatedSprint.id,

            squadId:
              updatedSprint.squadId,

            sprintId:
              updatedSprint.id,

            description:
              `Sprint "${updatedSprint.name}" was updated`,
          },
          tx
        );

        return updatedSprint;
      }
    );
  }

  // ==========================================
  // UPDATE STATUS
  // ==========================================

  async updateStatus(
    id,
    status,
    user
  ) {
    if (!user?.id) {
      throw new AppError(
        "Authentication required",
        401
      );
    }

    if (
      !VALID_STATUSES.includes(
        status
      )
    ) {
      throw new AppError(
        "Invalid sprint status",
        400
      );
    }

    const sprint =
      await sprintRepository.findById(
        id
      );

    if (!sprint) {
      throw new AppError(
        "Sprint not found",
        404
      );
    }

    await this.ensureSquadAccess(
      sprint.squadId,
      user
    );

    const allowedTransitions = {
      PLANNED: [
        "ACTIVE",
      ],

      ACTIVE: [
        "COMPLETED",
      ],

      COMPLETED: [],
    };

    if (
      !allowedTransitions[
        sprint.status
      ]?.includes(status)
    ) {
      throw new AppError(
        `Cannot change sprint status from ${sprint.status} to ${status}`,
        400
      );
    }

    if (status === "ACTIVE") {
      const activeSprint =
        await sprintRepository.findActiveBySquadId(
          sprint.squadId
        );

      if (
        activeSprint &&
        activeSprint.id !== id
      ) {
        throw new AppError(
          "An active sprint already exists for this squad",
          400
        );
      }
    }

    return await db.transaction(
      async (tx) => {
        const updatedSprint =
          await sprintRepository.update(
            id,
            {
              status,

              updatedAt:
                new Date(),
            },
            tx
          );

        if (!updatedSprint) {
          throw new AppError(
            "Sprint status update failed",
            500
          );
        }

        await activityService.log(
          {
            userId:
              user.id,

            action:
              "SPRINT_STATUS_CHANGED",

            entityType:
              "SPRINT",

            entityId:
              updatedSprint.id,

            squadId:
              updatedSprint.squadId,

            sprintId:
              updatedSprint.id,

            description:
              `Sprint status changed from ${sprint.status} to ${status}`,
          },
          tx
        );

        return updatedSprint;
      }
    );
  }

  // ==========================================
  // DELETE
  // ==========================================

  async delete(
    id,
    user
  ) {
    const sprint =
      await sprintRepository.findById(
        id
      );

    if (!sprint) {
      throw new AppError(
        "Sprint not found",
        404
      );
    }

    await this.ensureSquadAccess(
      sprint.squadId,
      user
    );

    if (
      sprint.status ===
      "COMPLETED"
    ) {
      throw new AppError(
        "Completed sprint cannot be deleted",
        400
      );
    }

    const ticketCount =
      await ticketRepository.countBySprintId(id);

    if (ticketCount > 0) {
      throw new AppError(
        "Cannot delete sprint with associated tickets. Move or delete tickets first.",
        400
      );
    }

    // ==========================================
    // TRANSACTION
    // Log SPRINT_DELETED first, then delete sprint.
    // activity_logs.sprint_id uses SET NULL on delete,
    // so the audit entry survives (sprintId → null).
    // entityId + entityType + description preserve history.
    // ==========================================

    return await db.transaction(
      async (tx) => {
        await activityService.log(
          {
            userId:
              user.id,

            action:
              "SPRINT_DELETED",

            entityType:
              "SPRINT",

            entityId:
              sprint.id,

            squadId:
              sprint.squadId,

            sprintId:
              sprint.id,

            description:
              `Sprint "${sprint.name}" was deleted`,
          },
          tx
        );

        const deletedSprint =
          await sprintRepository.delete(
            id,
            tx
          );

        if (!deletedSprint) {
          throw new AppError(
            "Sprint deletion failed",
            500
          );
        }

        return {
          message:
            "Sprint deleted successfully",
        };
      }
    );
  }
}

export default new SprintService();