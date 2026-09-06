import activityRepository from "../repositories/activity.repository.js";

class ActivityService {
  // ==========================================
  // CREATE ACTIVITY LOG
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
  // ==========================================

  async getTicketActivity(ticketId) {
    return await activityRepository.findByTicketId(
      ticketId
    );
  }

  // ==========================================
  // GET SQUAD ACTIVITY
  // ==========================================

  async getSquadActivity(squadId) {
    return await activityRepository.findBySquadId(
      squadId
    );
  }

  // ==========================================
  // GET SPRINT ACTIVITY
  // ==========================================

  async getSprintActivity(sprintId) {
    return await activityRepository.findBySprintId(
      sprintId
    );
  }
}

export default new ActivityService();