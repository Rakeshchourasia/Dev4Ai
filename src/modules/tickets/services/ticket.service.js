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
      throw new AppError("Squad ID is required", 400);
    }

    if (!sprintId) {
      throw new AppError("Sprint ID is required", 400);
    }

    if (!title) {
      throw new AppError("Ticket title is required", 400);
    }

    if (!createdBy) {
      throw new AppError("Created by user ID is required", 400);
    }

    // 2. Check Squad
    const squad = await squadRepository.findById(squadId);

    if (!squad) {
      throw new AppError("Squad not found", 404);
    }

    // 3. Check Sprint
    const sprint = await sprintRepository.findById(sprintId);

    if (!sprint) {
      throw new AppError("Sprint not found", 404);
    }

    // 4. Make sure Sprint belongs to Squad
    if (sprint.squadId !== squadId) {
      throw new AppError(
        "Sprint does not belong to this squad",
        400
      );
    }

    // 5. Check creator
    const creator = await authRepository.findById(createdBy);

    if (!creator) {
      throw new AppError(
        "Creator user not found",
        404
      );
    }

    // 6. Check assignee if provided
    if (assignedTo) {
      const assignee =
        await authRepository.findById(assignedTo);

      if (!assignee) {
        throw new AppError(
          "Assigned user not found",
          404
        );
      }
    }

    // 7. Validate priority
    if (
      priority &&
      !VALID_PRIORITIES.includes(priority)
    ) {
      throw new AppError(
        "Invalid ticket priority",
        400
      );
    }

    // 8. Create ticket
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
    const sprint = await sprintRepository.findById(sprintId);

    if (!sprint) {
      throw new AppError("Sprint not found", 404);
    }

    return await ticketRepository.findAllBySprintId(
      sprintId
    );
  }

  async getAllBySquad(squadId) {
    const squad = await squadRepository.findById(squadId);

    if (!squad) {
      throw new AppError("Squad not found", 404);
    }

    return await ticketRepository.findAllBySquadId(
      squadId
    );
  }

  async getById(id) {
    const ticket = await ticketRepository.findById(id);

    if (!ticket) {
      throw new AppError("Ticket not found", 404);
    }

    return ticket;
  }

  async update(id, ticketData) {
    const ticket = await ticketRepository.findById(id);

    if (!ticket) {
      throw new AppError("Ticket not found", 404);
    }

    if (
      ticketData.status &&
      !VALID_STATUSES.includes(ticketData.status)
    ) {
      throw new AppError(
        "Invalid ticket status",
        400
      );
    }

    if (
      ticketData.priority &&
      !VALID_PRIORITIES.includes(ticketData.priority)
    ) {
      throw new AppError(
        "Invalid ticket priority",
        400
      );
    }

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

    return await ticketRepository.update(
      id,
      ticketData
    );
  }

  async delete(id) {
    const ticket = await ticketRepository.findById(id);

    if (!ticket) {
      throw new AppError("Ticket not found", 404);
    }

    await ticketRepository.delete(id);

    return {
      message: "Ticket deleted successfully",
    };
  }
}

export default new TicketService();