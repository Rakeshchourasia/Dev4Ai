import ticketRepository from "../repositories/ticket.repository.js";
import squadRepository from "../../squads/repositories/squad.repository.js";
import sprintRepository from "../../sprints/repositories/sprint.repository.js";
import authRepository from "../../auth/repositories/auth.repository.js";
import squadMemberRepository from "../../squads/repositories/squadMember.repository.js";

import AppError from "../../../shared/errors/AppError.js";

import {
  getPagination,
  buildPagination,
} from "../../../shared/utils/pagination.js";

const VALID_STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "DONE",
];

const VALID_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

class TicketService {
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

    // ADMIN has access to every squad
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
  // CREATE TICKET
  // ==========================================

  async create(ticketData, user) {
    const {
      squadId,
      sprintId,
      title,
      description,
      priority,
      assignedTo,
    } = ticketData;

    // ------------------------------------------
    // AUTHENTICATION
    // ------------------------------------------

    if (!user?.id) {
      throw new AppError(
        "Authentication required",
        401
      );
    }

    // ------------------------------------------
    // REQUIRED FIELDS
    // ------------------------------------------

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

    if (!title) {
      throw new AppError(
        "Ticket title is required",
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
    // CHECK USER ACCESS
    // ------------------------------------------

    await this.ensureSquadAccess(
      squadId,
      user
    );

    // ------------------------------------------
    // CHECK SPRINT
    // ------------------------------------------

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

    // ------------------------------------------
    // SPRINT MUST BELONG TO SQUAD
    // ------------------------------------------

    if (sprint.squadId !== squadId) {
      throw new AppError(
        "Sprint does not belong to this squad",
        400
      );
    }

    // ------------------------------------------
    // CANNOT CREATE IN COMPLETED SPRINT
    // ------------------------------------------

    if (sprint.status === "COMPLETED") {
      throw new AppError(
        "Cannot create a ticket in a completed sprint",
        400
      );
    }

    // ------------------------------------------
    // CHECK ASSIGNEE
    // ------------------------------------------

    if (assignedTo) {
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

      const assigneeIsMember =
        await squadMemberRepository.isMember(
          squadId,
          assignedTo
        );

      if (!assigneeIsMember) {
        throw new AppError(
          "Assigned user is not a member of this squad",
          400
        );
      }
    }

    // ------------------------------------------
    // VALIDATE PRIORITY
    // ------------------------------------------

    if (
      priority &&
      !VALID_PRIORITIES.includes(priority)
    ) {
      throw new AppError(
        "Invalid ticket priority",
        400
      );
    }

    // ------------------------------------------
    // CREATE
    // ------------------------------------------

    return await ticketRepository.create({
      squadId,
      sprintId,
      title: title.trim(),
      description: description?.trim() || null,

      status: "TODO",

      priority:
        priority || "MEDIUM",

      // ALWAYS derive creator from JWT
      createdBy: user.id,

      assignedTo:
        assignedTo || null,
    });
  }

  // ==========================================
  // GET TICKETS BY SPRINT
  // ==========================================

  async getAllBySprint(
    sprintId,
    query = {},
    user
  ) {
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

    // Check access through Sprint's Squad
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
      status: query.status,
      priority: query.priority,
    };

    const tickets =
      await ticketRepository.findAllBySprintId(
        sprintId,
        {
          limit,
          offset,
          ...filters,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
        }
      );

    const total =
      await ticketRepository.countBySprintId(
        sprintId,
        filters
      );

    return {
      tickets,

      pagination: buildPagination(
        page,
        limit,
        total
      ),
    };
  }

  // ==========================================
  // GET TICKETS BY SQUAD
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

    // Check membership / ADMIN
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
      status: query.status,
      priority: query.priority,
    };

    const tickets =
      await ticketRepository.findAllBySquadId(
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
      await ticketRepository.countBySquadId(
        squadId,
        filters
      );

    return {
      tickets,

      pagination: buildPagination(
        page,
        limit,
        total
      ),
    };
  }

  // ==========================================
  // GET TICKET BY ID
  // ==========================================

  async getById(id, user) {
    const ticket =
      await ticketRepository.findById(id);

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
    const ticket =
      await ticketRepository.findById(id);

    if (!ticket) {
      throw new AppError(
        "Ticket not found",
        404
      );
    }

    // ------------------------------------------
    // DETERMINE FINAL SQUAD
    // ------------------------------------------

    const finalSquadId =
      ticketData.squadId ||
      ticket.squadId;

    // ------------------------------------------
    // USER MUST HAVE ACCESS TO FINAL SQUAD
    // ------------------------------------------

    await this.ensureSquadAccess(
      finalSquadId,
      user
    );

    // ------------------------------------------
    // VALIDATE STATUS
    // ------------------------------------------

    if (
      ticketData.status &&
      !VALID_STATUSES.includes(
        ticketData.status
      )
    ) {
      throw new AppError(
        "Invalid ticket status",
        400
      );
    }

    // ------------------------------------------
    // VALIDATE PRIORITY
    // ------------------------------------------

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

    // ------------------------------------------
    // IF CHANGING SQUAD
    // ------------------------------------------

    if (ticketData.squadId) {
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
    }

    // ------------------------------------------
    // DETERMINE FINAL SPRINT
    // ------------------------------------------

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

    // ------------------------------------------
    // SPRINT MUST BELONG TO FINAL SQUAD
    // ------------------------------------------

    if (
      sprint.squadId !== finalSquadId
    ) {
      throw new AppError(
        "Sprint does not belong to this squad",
        400
      );
    }

    // ------------------------------------------
    // COMPLETED SPRINT PROTECTION
    // ------------------------------------------

    if (
      sprint.status === "COMPLETED" &&
      (
        ticketData.sprintId ||
        ticketData.squadId
      )
    ) {
      throw new AppError(
        "Cannot move ticket to a completed sprint",
        400
      );
    }

    // ------------------------------------------
    // VALIDATE ASSIGNEE
    // ------------------------------------------

    if (
      ticketData.assignedTo
    ) {
      const assignee =
        await authRepository.findById(
          ticketData.assignedTo
        );

      if (!assignee) {
        throw new AppError(
          "Assigned user not found",
          404
        );
      }

      const assigneeIsMember =
        await squadMemberRepository.isMember(
          finalSquadId,
          ticketData.assignedTo
        );

      if (!assigneeIsMember) {
        throw new AppError(
          "Assigned user is not a member of this squad",
          400
        );
      }
    }

    // ------------------------------------------
    // CLEAN UPDATE DATA
    // ------------------------------------------

    const updateData = {
      ...ticketData,
      updatedAt: new Date(),
    };

    if (
      updateData.title !== undefined
    ) {
      updateData.title =
        updateData.title.trim();
    }

    if (
      updateData.description !== undefined
    ) {
      updateData.description =
        updateData.description?.trim() ||
        null;
    }

    // Never allow these fields to be changed
    // through a normal ticket update.
    delete updateData.createdBy;

    return await ticketRepository.update(
      id,
      updateData
    );
  }

  // ==========================================
  // DELETE TICKET
  // ==========================================

  async delete(id, user) {
    const ticket =
      await ticketRepository.findById(id);

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

    await ticketRepository.delete(id);

    return {
      message:
        "Ticket deleted successfully",
    };
  }
}

export default new TicketService();