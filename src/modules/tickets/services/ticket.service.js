import { db } from "../../../db/index.js";

import ticketRepository from "../repositories/ticket.repository.js";
import squadRepository from "../../squads/repositories/squad.repository.js";
import sprintRepository from "../../sprints/repositories/sprint.repository.js";
import authRepository from "../../auth/repositories/auth.repository.js";
import squadMemberRepository from "../../squads/repositories/squadMember.repository.js";
import activityService from "../../activity/services/activity.service.js";

import AppError from "../../../shared/errors/AppError.js";

import {
  getPagination,
  buildPagination,
} from "../../../shared/utils/pagination.js";

const VALID_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

class TicketService {
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
        "You do not have access to this squad",
        403
      );
    }
  }

  // ==========================================
  // ASSIGNEE VALIDATION
  // ==========================================

  async ensureAssigneeIsSquadMember(
    squadId,
    assignedTo
  ) {
    if (!assignedTo) {
      return;
    }

    const assignee =
      await authRepository.findById(
        assignedTo
      );

    if (!assignee) {
      throw new AppError(
        "Assigned user not found",
        404
      );
    }

    const isMember =
      await squadMemberRepository.isMember(
        squadId,
        assignedTo
      );

    if (!isMember) {
      throw new AppError(
        "Assigned user is not a member of this squad",
        400
      );
    }
  }

  // ==========================================
  // CREATE
  // ==========================================

  async create(
    ticketData,
    user
  ) {
    if (!user?.id) {
      throw new AppError(
        "Authentication required",
        401
      );
    }

    const {
      squadId,
      sprintId,
      title,
      description,
      priority,
      assignedTo,
    } = ticketData;

    if (!squadId) {
      throw new AppError(
        "Squad ID is required",
        400
      );
    }

    if (!sprintId) {
      throw new AppError(
        "Sprint ID is required",
        400
      );
    }

    if (!title?.trim()) {
      throw new AppError(
        "Ticket title is required",
        400
      );
    }

    await this.ensureSquadAccess(
      squadId,
      user
    );

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

    const sprint =
      await sprintRepository.findById(
        sprintId
      );

    if (!sprint) {
      throw new AppError(
        "Sprint not found",
        404
      );
    }

    if (
      sprint.squadId !== squadId
    ) {
      throw new AppError(
        "Sprint does not belong to this squad",
        400
      );
    }

    if (
      sprint.status ===
      "COMPLETED"
    ) {
      throw new AppError(
        "Cannot create a ticket in a completed sprint",
        400
      );
    }

    if (
      priority &&
      !VALID_PRIORITIES.includes(
        priority
      )
    ) {
      throw new AppError(
        "Invalid ticket priority",
        400
      );
    }

    await this.ensureAssigneeIsSquadMember(
      squadId,
      assignedTo
    );

    // ==========================================
    // TRANSACTION
    // Ticket + activity must both succeed
    // ==========================================

    return await db.transaction(
      async (tx) => {
        const ticket =
          await ticketRepository.create(
            {
              squadId,
              sprintId,
              title: title.trim(),

              description:
                description
                  ? description.trim()
                  : null,

              status: "TODO",

              priority:
                priority ||
                "MEDIUM",

              createdBy:
                user.id,

              assignedTo:
                assignedTo ||
                null,
            },
            tx
          );

        await activityService.log(
          {
            userId:
              user.id,

            action:
              "TICKET_CREATED",

            entityType:
              "TICKET",

            entityId:
              ticket.id,

            ticketId:
              ticket.id,

            squadId:
              ticket.squadId,

            sprintId:
              ticket.sprintId,

            description:
              `Ticket "${ticket.title}" was created`,
          },
          tx
        );

        return ticket;
      }
    );
  }

  // ==========================================
  // GET BY SPRINT
  // ==========================================

  async getAllBySprint(
    sprintId,
    query = {},
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
        sprintId
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

    const {
      page,
      limit,
      offset,
    } = getPagination(query);

    const filters = {
      status:
        query.status,

      priority:
        query.priority,
    };

    const tickets =
      await ticketRepository.findAllBySprintId(
        sprintId,
        {
          limit,
          offset,

          status:
            filters.status,

          priority:
            filters.priority,

          sortBy:
            query.sortBy,

          sortOrder:
            query.sortOrder,
        }
      );

    const total =
      await ticketRepository.countBySprintId(
        sprintId,
        filters
      );

    return {
      tickets,

      pagination:
        buildPagination(
          page,
          limit,
          total
        ),
    };
  }

  // ==========================================
  // GET BY SQUAD
  // ==========================================

  async getAllBySquad(
    squadId,
    query = {},
    user
  ) {
    if (!user?.id) {
      throw new AppError(
        "Authentication required",
        401
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

    const {
      page,
      limit,
      offset,
    } = getPagination(query);

    const filters = {
      status:
        query.status,

      priority:
        query.priority,
    };

    const tickets =
      await ticketRepository.findAllBySquadId(
        squadId,
        {
          limit,
          offset,

          status:
            filters.status,

          priority:
            filters.priority,

          sortBy:
            query.sortBy,

          sortOrder:
            query.sortOrder,
        }
      );

    const total =
      await ticketRepository.countBySquadId(
        squadId,
        filters
      );

    return {
      tickets,

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
    if (!user?.id) {
      throw new AppError(
        "Authentication required",
        401
      );
    }

    const ticket =
      await ticketRepository.findById(
        id
      );

    if (!ticket) {
      throw new AppError(
        "Ticket not found",
        404
      );
    }

    await this.ensureSquadAccess(
      ticket.squadId,
      user
    );

    return ticket;
  }

  // ==========================================
  // UPDATE TICKET
  // ==========================================

  async update(
    id,
    ticketData,
    user
  ) {
    if (!user?.id) {
      throw new AppError(
        "Authentication required",
        401
      );
    }

    const ticket =
      await ticketRepository.findById(
        id
      );

    if (!ticket) {
      throw new AppError(
        "Ticket not found",
        404
      );
    }

    await this.ensureSquadAccess(
      ticket.squadId,
      user
    );

    const currentSprint =
      await sprintRepository.findById(
        ticket.sprintId
      );

    if (!currentSprint) {
      throw new AppError(
        "Current sprint not found",
        404
      );
    }

    if (
      currentSprint.status ===
      "COMPLETED"
    ) {
      throw new AppError(
        "Cannot modify a ticket in a completed sprint",
        400
      );
    }

    // Status must ONLY be changed through
    // updateStatus().
    if (
      Object.prototype.hasOwnProperty.call(
        ticketData,
        "status"
      )
    ) {
      throw new AppError(
        "Use the ticket status endpoint to change ticket status",
        400
      );
    }

    if (
      ticketData.priority &&
      !VALID_PRIORITIES.includes(
        ticketData.priority
      )
    ) {
      throw new AppError(
        "Invalid ticket priority",
        400
      );
    }

    const finalSquadId =
      ticketData.squadId ||
      ticket.squadId;

    if (
      ticketData.squadId &&
      ticketData.squadId !==
        ticket.squadId
    ) {
      const squad =
        await squadRepository.findById(
          ticketData.squadId
        );

      if (!squad) {
        throw new AppError(
          "Squad not found",
          404
        );
      }

      await this.ensureSquadAccess(
        ticketData.squadId,
        user
      );
    }

    const finalSprintId =
      ticketData.sprintId ||
      ticket.sprintId;

    const sprint =
      await sprintRepository.findById(
        finalSprintId
      );

    if (!sprint) {
      throw new AppError(
        "Sprint not found",
        404
      );
    }

    if (
      sprint.squadId !==
      finalSquadId
    ) {
      throw new AppError(
        "Sprint does not belong to this squad",
        400
      );
    }

    if (
      sprint.status ===
      "COMPLETED"
    ) {
      throw new AppError(
        "Cannot move or update a ticket in a completed sprint",
        400
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(
        ticketData,
        "assignedTo"
      )
    ) {
      await this.ensureAssigneeIsSquadMember(
        finalSquadId,
        ticketData.assignedTo
      );
    }

    const updateData = {
      updatedAt:
        new Date(),
    };

    if (
      Object.prototype.hasOwnProperty.call(
        ticketData,
        "squadId"
      )
    ) {
      updateData.squadId =
        ticketData.squadId;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        ticketData,
        "sprintId"
      )
    ) {
      updateData.sprintId =
        ticketData.sprintId;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        ticketData,
        "title"
      )
    ) {
      const title =
        ticketData.title?.trim();

      if (!title) {
        throw new AppError(
          "Ticket title cannot be empty",
          400
        );
      }

      updateData.title =
        title;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        ticketData,
        "description"
      )
    ) {
      updateData.description =
        ticketData.description
          ?.trim() ||
        null;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        ticketData,
        "priority"
      )
    ) {
      updateData.priority =
        ticketData.priority;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        ticketData,
        "assignedTo"
      )
    ) {
      updateData.assignedTo =
        ticketData.assignedTo ||
        null;
    }

    // ==========================================
    // TRANSACTION
    // Ticket update + activity
    // ==========================================

    return await db.transaction(
      async (tx) => {
        const updatedTicket =
          await ticketRepository.update(
            id,
            updateData,
            tx
          );

        if (!updatedTicket) {
          throw new AppError(
            "Ticket update failed",
            500
          );
        }

        await activityService.log(
          {
            userId:
              user.id,

            action:
              "TICKET_UPDATED",

            entityType:
              "TICKET",

            entityId:
              updatedTicket.id,

            ticketId:
              updatedTicket.id,

            squadId:
              updatedTicket.squadId,

            sprintId:
              updatedTicket.sprintId,

            description:
              `Ticket "${updatedTicket.title}" was updated`,
          },
          tx
        );

        return updatedTicket;
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

    const ticket =
      await ticketRepository.findById(
        id
      );

    if (!ticket) {
      throw new AppError(
        "Ticket not found",
        404
      );
    }

    await this.ensureSquadAccess(
      ticket.squadId,
      user
    );

    const sprint =
      await sprintRepository.findById(
        ticket.sprintId
      );

    if (!sprint) {
      throw new AppError(
        "Sprint not found",
        404
      );
    }

    if (
      sprint.status ===
      "COMPLETED"
    ) {
      throw new AppError(
        "Cannot change ticket status in a completed sprint",
        400
      );
    }

    const currentStatus =
      ticket.status;

    if (
      currentStatus === status
    ) {
      return ticket;
    }

    const allowedTransitions = {
      TODO: [
        "IN_PROGRESS",
      ],

      IN_PROGRESS: [
        "TODO",
        "DONE",
      ],

      DONE: [],
    };

    if (
      !allowedTransitions[
        currentStatus
      ]?.includes(status)
    ) {
      throw new AppError(
        `Invalid ticket status transition: ${currentStatus} → ${status}`,
        400
      );
    }

    // ==========================================
    // TRANSACTION
    // Status update + activity
    // ==========================================

    return await db.transaction(
      async (tx) => {
        const updatedTicket =
          await ticketRepository.update(
            id,
            {
              status,

              updatedAt:
                new Date(),
            },
            tx
          );

        if (!updatedTicket) {
          throw new AppError(
            "Ticket status update failed",
            500
          );
        }

        await activityService.log(
          {
            userId:
              user.id,

            action:
              "TICKET_STATUS_CHANGED",

            entityType:
              "TICKET",

            entityId:
              updatedTicket.id,

            ticketId:
              updatedTicket.id,

            squadId:
              updatedTicket.squadId,

            sprintId:
              updatedTicket.sprintId,

            description:
              `Ticket status changed from ${currentStatus} to ${status}`,
          },
          tx
        );

        return updatedTicket;
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
    if (!user?.id) {
      throw new AppError(
        "Authentication required",
        401
      );
    }

    const ticket =
      await ticketRepository.findById(
        id
      );

    if (!ticket) {
      throw new AppError(
        "Ticket not found",
        404
      );
    }

    await this.ensureSquadAccess(
      ticket.squadId,
      user
    );

    const sprint =
      await sprintRepository.findById(
        ticket.sprintId
      );

    if (
      sprint &&
      sprint.status ===
        "COMPLETED"
    ) {
      throw new AppError(
        "Cannot delete a ticket from a completed sprint",
        400
      );
    }

    /*
     * IMPORTANT:
     *
     * Your current activity_logs.ticketId
     * foreign key uses ON DELETE CASCADE.
     *
     * Therefore creating a TICKET_DELETED
     * activity and then deleting the ticket
     * would immediately delete that activity.
     *
     * Until we fix audit retention, simply
     * delete the ticket here.
     */

    const deletedTicket =
      await ticketRepository.delete(
        id
      );

    if (!deletedTicket) {
      throw new AppError(
        "Ticket deletion failed",
        500
      );
    }

    return {
      message:
        "Ticket deleted successfully",
    };
  }
}

export default new TicketService();