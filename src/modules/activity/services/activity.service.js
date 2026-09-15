import activityRepository from "../repositories/activity.repository.js";
import ticketRepository from "../../tickets/repositories/ticket.repository.js";
import sprintRepository from "../../sprints/repositories/sprint.repository.js";
import squadMemberRepository from "../../squads/repositories/squadMember.repository.js";
import AppError from "../../../shared/errors/AppError.js";

class ActivityService {
  // ==========================================
  // INTERNAL: CHECK SQUAD ACCESS
  // ==========================================

  async ensureSquadAccess(squadId, user) {
    if (!user?.id) {
      throw new AppError("Authentication required", 401);
    }

    if (user.role === "ADMIN") {
      return;
    }

    const isMember = await squadMemberRepository.isMember(
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
  // CREATE ACTIVITY LOG
  // Supports normal DB connection or transaction executor
  // ==========================================

  async log(
    {
      userId,
      action,
      entityType,
      entityId,
      description,
      ticketId = null,
      squadId = null,
      sprintId = null,
    },
    database
  ) {
    return await activityRepository.create(
      {
        userId,
        action,
        entityType,
        entityId,
        description,
        ticketId,
        squadId,
        sprintId,
      },
      database
    );
  }

  // ==========================================
  // GET TICKET ACTIVITY
  // Verifies caller has access to the ticket's squad
  // ==========================================

  async getTicketActivity(ticketId, user) {
    const ticket = await ticketRepository.findById(ticketId);

    if (!ticket) {
      throw new AppError("Ticket not found", 404);
    }

    await this.ensureSquadAccess(ticket.squadId, user);

    return await activityRepository.findByTicketId(ticketId);
  }

  // ==========================================
  // GET SQUAD ACTIVITY
  // Squad access is already enforced via route middleware
  // ==========================================

  async getSquadActivity(squadId) {
    return await activityRepository.findBySquadId(squadId);
  }

  // ==========================================
  // GET SPRINT ACTIVITY
  // Verifies caller has access to the sprint's squad
  // ==========================================

  async getSprintActivity(sprintId, user) {
    const sprint = await sprintRepository.findById(sprintId);

    if (!sprint) {
      throw new AppError("Sprint not found", 404);
    }

    await this.ensureSquadAccess(sprint.squadId, user);

    return await activityRepository.findBySprintId(sprintId);
  }
}

export default new ActivityService();