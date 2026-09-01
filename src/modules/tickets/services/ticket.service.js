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

const ALLOWED_STATUS_TRANSITIONS = {
  TODO: ["IN_PROGRESS"],
  IN_PROGRESS: ["DONE"],
  DONE: [],
};

class TicketService {
  // ==========================================
  // ENSURE SQUAD ACCESS
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

    if (!title?.trim()) {
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
    // COMPLETED SPRINT
    // ------------------------------------------

    if (sprint.status === "COMPLETED") {
      throw new AppError(
        "Cannot create a ticket in a completed sprint",
        400
      );
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
    // VALIDATE ASSIGNEE
    // ------------------------------------------

    if (
      assignedTo !== undefined &&
      assignedTo !== null
    ) {
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
    // CREATE
    // ------------------------------------------

    return await ticketRepository.create({
      squadId,
      sprintId,
      title: title.trim(),
      description:
        description?.trim() || null,

      status: "TODO",

      priority:
        priority || "MEDIUM",

      // IMPORTANT:
      // Always derive creator from JWT.
      createdBy: user.id,

      assignedTo:
        assignedTo ?? null,
    });
  }

  // ==========================================
  // GET ALL BY SPRINT
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
  // GET BY ID
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
    // SQUAD CANNOT BE CHANGED
    // ------------------------------------------

    if (
      ticketData.squadId !== undefined
    ) {
      throw new AppError(
        "Ticket squad cannot be changed",
        400
      );
    }

    // ------------------------------------------
    // CHECK CURRENT SQUAD ACCESS
    // ------------------------------------------

    await this.ensureSquadAccess(
      ticket.squadId,
      user
    );

    // ------------------------------------------
    // VALIDATE STATUS
    // ------------------------------------------

    if (ticketData.status) {
      if (
        !VALID_STATUSES.includes(
          ticketData.status
        )
      ) {
        throw new AppError(
          "Invalid ticket status",
          400
        );
      }

      const allowedTransitions =
        ALLOWED_STATUS_TRANSITIONS[
          ticket.status
        ];

      if (
        !allowedTransitions?.includes(
          ticketData.status
        )
      ) {
        throw new AppError(
          `Cannot change ticket status from ${ticket.status} to ${ticketData.status}`,
          400
        );
      }
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
    // SPRINT MUST BELONG TO SAME SQUAD
    // ------------------------------------------

    if (
      sprint.squadId !== ticket.squadId
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
      sprint.status === "COMPLETED"
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
      ticketData.assignedTo !== undefined &&
      ticketData.assignedTo !== null
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

      const isMember =
        await squadMemberRepository.isMember(
          ticket.squadId,
          ticketData.assignedTo
        );

      if (!isMember) {
        throw new AppError(
          "Assigned user is not a member of this squad",
          400
        );
      }
    }

    // ------------------------------------------
    // BUILD UPDATE DATA
    // ------------------------------------------

    const updateData = {
      ...ticketData,
      updatedAt: new Date(),
    };

    // Never allow creator modification
    delete updateData.createdBy;

    // Never allow squad modification
    delete updateData.squadId;

    // ------------------------------------------
    // CLEAN TITLE
    // ------------------------------------------

    if (
      updateData.title !== undefined
    ) {
      if (!updateData.title?.trim()) {
        throw new AppError(
          "Ticket title cannot be empty",
          400
        );
      }

      updateData.title =
        updateData.title.trim();
    }

    // ------------------------------------------
    // CLEAN DESCRIPTION
    // ------------------------------------------

    if (
      updateData.description !== undefined
    ) {
      updateData.description =
        updateData.description?.trim() ||
        null;
    }

    // ------------------------------------------
    // ALLOW NULL ASSIGNEE
    // ------------------------------------------

    if (
      updateData.assignedTo === null
    ) {
      updateData.assignedTo = null;
    }

    // ------------------------------------------
    // UPDATE
    // ------------------------------------------

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