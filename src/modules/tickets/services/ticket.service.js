import ticketRepository from "../repositories/ticket.repository.js";
import squadRepository from "../../squads/repositories/squad.repository.js";
import sprintRepository from "../../sprints/repositories/sprint.repository.js";
import authRepository from "../../auth/repositories/auth.repository.js";
import AppError from "../../../shared/errors/AppError.js";

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
  async create(ticketData) {
    const {
      squadId,
      sprintId,
      title,
      description,
      priority,
      createdBy,
      assignedTo,
    } = ticketData;

    // 1. Required fields
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

    if (!createdBy) {
      throw new AppError(
        "Created by user ID is required",
        400
      );
    }

    // 2. Check Squad
    const squad =
      await squadRepository.findById(squadId);

    if (!squad) {
      throw new AppError(
        "Squad not found",
        404
      );
    }

    // 3. Check Sprint
    const sprint =
      await sprintRepository.findById(sprintId);

    if (!sprint) {
      throw new AppError(
        "Sprint not found",
        404
      );
    }

    // 4. Make sure Sprint belongs to Squad
    if (sprint.squadId !== squadId) {
      throw new AppError(
        "Sprint does not belong to this squad",
        400
      );
    }

    // 5. Cannot create ticket in completed Sprint
    if (sprint.status === "COMPLETED") {
      throw new AppError(
        "Cannot create a ticket in a completed sprint",
        400
      );
    }

    // 6. Check creator
    const creator =
      await authRepository.findById(createdBy);

    if (!creator) {
      throw new AppError(
        "Creator user not found",
        404
      );
    }

    // 7. Check assignee if provided
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
    }

    // 8. Validate priority
    if (
      priority &&
      !VALID_PRIORITIES.includes(priority)
    ) {
      throw new AppError(
        "Invalid ticket priority",
        400
      );
    }

    // 9. Create ticket
    return await ticketRepository.create({
      squadId,
      sprintId,
      title,
      description: description || null,
      status: "TODO",
      priority: priority || "MEDIUM",
      createdBy,
      assignedTo: assignedTo || null,
    });
  }

  async getAllBySprint(sprintId) {
    const sprint =
      await sprintRepository.findById(sprintId);

    if (!sprint) {
      throw new AppError(
        "Sprint not found",
        404
      );
    }

    return await ticketRepository.findAllBySprintId(
      sprintId
    );
  }

  async getAllBySquad(squadId) {
    const squad =
      await squadRepository.findById(squadId);

    if (!squad) {
      throw new AppError(
        "Squad not found",
        404
      );
    }

    return await ticketRepository.findAllBySquadId(
      squadId
    );
  }

  async getById(id) {
    const ticket =
      await ticketRepository.findById(id);

    if (!ticket) {
      throw new AppError(
        "Ticket not found",
        404
      );
    }

    return ticket;
  }

  async update(id, ticketData) {
    const ticket =
      await ticketRepository.findById(id);

    if (!ticket) {
      throw new AppError(
        "Ticket not found",
        404
      );
    }

    // ==========================================
    // 1. Validate Ticket Status
    // ==========================================

    if (ticketData.status) {
      // Check valid status
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

      // Prevent same status
      if (
        ticketData.status === ticket.status
      ) {
        throw new AppError(
          `Ticket is already ${ticket.status}`,
          400
        );
      }

      // Check allowed transition
      const allowedTransitions =
        ALLOWED_STATUS_TRANSITIONS[
        ticket.status
        ];

      if (
        !allowedTransitions.includes(
          ticketData.status
        )
      ) {
        throw new AppError(
          `Cannot change ticket status from ${ticket.status} to ${ticketData.status}`,
          400
        );
      }
    }

    // ==========================================
    // 2. Validate Priority
    // ==========================================

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

    // ==========================================
    // 3. Validate Assignee
    // ==========================================

    if (ticketData.assignedTo) {
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
    }

    // ==========================================
    // 4. If changing Sprint
    // ==========================================

    if (ticketData.sprintId) {
      const sprint =
        await sprintRepository.findById(
          ticketData.sprintId
        );

      if (!sprint) {
        throw new AppError(
          "Sprint not found",
          404
        );
      }

      // Cannot move ticket to completed Sprint
      if (sprint.status === "COMPLETED") {
        throw new AppError(
          "Cannot move ticket to a completed sprint",
          400
        );
      }

      // Determine Squad
      const squadId =
        ticketData.squadId ||
        ticket.squadId;

      // Sprint must belong to Squad
      if (sprint.squadId !== squadId) {
        throw new AppError(
          "Sprint does not belong to this squad",
          400
        );
      }
    }

    // ==========================================
    // 5. If changing Squad
    // ==========================================

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

      // Determine Sprint
      const sprintId =
        ticketData.sprintId ||
        ticket.sprintId;

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

      // Sprint must belong to new Squad
      if (
        sprint.squadId !==
        ticketData.squadId
      ) {
        throw new AppError(
          "Sprint does not belong to this squad",
          400
        );
      }

      // Cannot move to completed Sprint
      if (sprint.status === "COMPLETED") {
        throw new AppError(
          "Cannot move ticket to a completed sprint",
          400
        );
      }
    }

    // ==========================================
    // 6. Update Ticket
    // ==========================================

    return await ticketRepository.update(
      id,
      {
        ...ticketData,
        updatedAt: new Date(),
      }
    );
  }

  async delete(id) {
    const ticket =
      await ticketRepository.findById(id);

    if (!ticket) {
      throw new AppError(
        "Ticket not found",
        404
      );
    }

    await ticketRepository.delete(id);

    return {
      message: "Ticket deleted successfully",
    };
  }
}

export default new TicketService();