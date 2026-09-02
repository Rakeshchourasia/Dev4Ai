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

import activityService from "../../activity/services/activity.service.js";

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
  // COMMON ACCESS CHECK
  // ==========================================

  async ensureSquadAccess(squadId, user) {
    if (!user) {
      throw new AppError(
        "Authentication required",
        401
      );
    }

    // ADMIN has global access
    if (user.role === "ADMIN") {
      return;
    }

    if (!user.id) {
      throw new AppError(
        "Invalid authenticated user",
        401
      );
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
  // CHECK ASSIGNEE
  // ==========================================

  async ensureAssigneeIsSquadMember(
    squadId,
    assignedTo
  ) {
    // null/undefined means unassigned
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
  // CREATE TICKET
  // ==========================================

  async create(ticketData, user) {
    if (!user) {
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

    if (!title || !title.trim()) {
      throw new AppError(
        "Ticket title is required",
        400
      );
    }

    // ------------------------------------------
    // CHECK SQUAD ACCESS
    // ------------------------------------------

    await this.ensureSquadAccess(
      squadId,
      user
    );

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
    // COMPLETED SPRINT PROTECTION
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

    await this.ensureAssigneeIsSquadMember(
      squadId,
      assignedTo
    );

    // ------------------------------------------
    // CREATE TICKET
    // createdBy ALWAYS comes from JWT
    // ------------------------------------------

    const ticket =
      await ticketRepository.create({
        squadId,
        sprintId,
        title: title.trim(),
        description: description
          ? description.trim()
          : null,
        status: "TODO",
        priority: priority || "MEDIUM",
        createdBy: user.id,
        assignedTo: assignedTo || null,
      });

    await activityService.log({
      userId: user.id,
      action: "TICKET_CREATED",
      entityType: "TICKET",
      entityId: ticket.id,
      ticketId: ticket.id,
      squadId: ticket.squadId,
      sprintId: ticket.sprintId,
      description: `Ticket "${ticket.title}" was created`,
    });

    return ticket;
  }

  // ==========================================
  // GET TICKETS BY SPRINT
  // ==========================================

  async getAllBySprint(
    sprintId,
    query = {},
    user
  ) {
    if (!user) {
      throw new AppError(
        "Authentication required",
        401
      );
    }

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
    // CHECK SQUAD ACCESS
    // ------------------------------------------

    await this.ensureSquadAccess(
      sprint.squadId,
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

    const filters = {
      status: query.status,
      priority: query.priority,
    };

    // ------------------------------------------
    // FETCH
    // ------------------------------------------

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
    if (!user) {
      throw new AppError(
        "Authentication required",
        401
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

    const filters = {
      status: query.status,
      priority: query.priority,
    };

    // ------------------------------------------
    // FETCH
    // ------------------------------------------

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
    if (!user) {
      throw new AppError(
        "Authentication required",
        401
      );
    }

    const ticket =
      await ticketRepository.findById(id);

    if (!ticket) {
      throw new AppError(
        "Ticket not found",
        404
      );
    }

    // ------------------------------------------
    // CHECK ACCESS TO TICKET'S SQUAD
    // ------------------------------------------

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
    if (!user) {
      throw new AppError(
        "Authentication required",
        401
      );
    }

    // ------------------------------------------
    // FIND EXISTING TICKET
    // ------------------------------------------

    const ticket =
      await ticketRepository.findById(id);

    if (!ticket) {
      throw new AppError(
        "Ticket not found",
        404
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
    // COMPLETED SPRINT PROTECTION
    // ------------------------------------------

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
      currentSprint.status === "COMPLETED"
    ) {
      throw new AppError(
        "Cannot modify a ticket in a completed sprint",
        400
      );
    }

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
    // DETERMINE FINAL SQUAD
    // ------------------------------------------

    const finalSquadId =
      ticketData.squadId ||
      ticket.squadId;

    // ------------------------------------------
    // CHECK NEW SQUAD
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

      // MEMBER must also have access
      // to the destination squad
      await this.ensureSquadAccess(
        ticketData.squadId,
        user
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
    // CANNOT USE COMPLETED SPRINT
    // ------------------------------------------

    if (
      sprint.status === "COMPLETED"
    ) {
      throw new AppError(
        "Cannot move or update a ticket in a completed sprint",
        400
      );
    }

    // ------------------------------------------
    // VALIDATE ASSIGNEE
    // ------------------------------------------

    // Important:
    // null is allowed so a ticket can be
    // unassigned.
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

    // ------------------------------------------
    // PREPARE UPDATE DATA
    // ------------------------------------------

    const updateData = {
      updatedAt: new Date(),
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
      updateData.title =
        ticketData.title.trim();
    }

    if (
      Object.prototype.hasOwnProperty.call(
        ticketData,
        "description"
      )
    ) {
      updateData.description =
        ticketData.description?.trim() || null;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        ticketData,
        "status"
      )
    ) {
      updateData.status =
        ticketData.status;
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
        ticketData.assignedTo;
    }

    // ------------------------------------------
    // UPDATE
    // ------------------------------------------

    const updatedTicket =
      await ticketRepository.update(
        id,
        updateData
      );

    await activityService.log({
      userId: user.id,
      action: "TICKET_UPDATED",
      entityType: "TICKET",
      entityId: ticket.id,
      ticketId: ticket.id,
      squadId: updatedTicket.squadId,
      sprintId: updatedTicket.sprintId,
      description: `Ticket "${updatedTicket.title}" was updated`,
    });

    return updatedTicket;
  }

  // ==========================================
  // DELETE TICKET
  // ==========================================

  async delete(id, user) {
    if (!user) {
      throw new AppError(
        "Authentication required",
        401
      );
    }

    // ------------------------------------------
    // FIND TICKET
    // ------------------------------------------

    const ticket =
      await ticketRepository.findById(id);

    if (!ticket) {
      throw new AppError(
        "Ticket not found",
        404
      );
    }

    // ------------------------------------------
    // CHECK SQUAD ACCESS
    // ------------------------------------------

    await this.ensureSquadAccess(
      ticket.squadId,
      user
    );

    // ------------------------------------------
    // COMPLETED SPRINT PROTECTION
    // ------------------------------------------

    const sprint =
      await sprintRepository.findById(
        ticket.sprintId
      );

    if (
      sprint &&
      sprint.status === "COMPLETED"
    ) {
      throw new AppError(
        "Cannot delete a ticket from a completed sprint",
        400
      );
    }

    // ------------------------------------------
    // DELETE
    // ------------------------------------------

    await activityService.log({
      userId: user.id,
      action: "TICKET_DELETED",
      entityType: "TICKET",
      entityId: ticket.id,
      ticketId: ticket.id,
      squadId: ticket.squadId,
      sprintId: ticket.sprintId,
      description: `Ticket "${ticket.title}" was deleted`,
    });

    await ticketRepository.delete(id);

    return {
      message: "Ticket deleted successfully",
    };
  }

  async updateStatus(id, status, user) {
    if (!user) {
      throw new AppError(
        "Authentication required",
        401
      );
    }

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

    if (sprint.status === "COMPLETED") {
      throw new AppError(
        "Cannot change ticket status in a completed sprint",
        400
      );
    }

    const currentStatus = ticket.status;

    // Same status — nothing to change
    if (currentStatus === status) {
      return ticket;
    }

    const allowedTransitions = {
      TODO: ["IN_PROGRESS"],
      IN_PROGRESS: ["TODO", "DONE"],
      DONE: [],
    };

    if (
      !allowedTransitions[currentStatus]?.includes(
        status
      )
    ) {
      throw new AppError(
        `Invalid ticket status transition: ${currentStatus} → ${status}`,
        400
      );
    }

    const updatedTicket =
      await ticketRepository.update(
        id,
        {
          status,
          updatedAt: new Date(),
        }
      );

    await activityService.log({
      userId: user.id,
      action: "TICKET_STATUS_CHANGED",
      entityType: "TICKET",
      entityId: ticket.id,
      ticketId: ticket.id,
      squadId: ticket.squadId,
      sprintId: ticket.sprintId,
      description: `Ticket status changed from ${currentStatus} to ${status}`,
    });

    return updatedTicket;
  }

}

export default new TicketService();