import activityRepository from "../repositories/activity.repository.js";

class ActivityService {
  async log({
    userId,
    action,
    entityType,
    entityId,
    description,
    ticketId = null,
    squadId = null,
    sprintId = null,
  }) {
    return await activityRepository.create({
      userId,
      action,
      entityType,
      entityId,
      description,
      ticketId,
      squadId,
      sprintId,
    });
  }

  async getTicketActivity(ticketId) {
    return await activityRepository.findByTicketId(
      ticketId
    );
  }

  async getSquadActivity(squadId) {
    return await activityRepository.findBySquadId(
      squadId
    );
  }

  async getSprintActivity(sprintId) {
    return await activityRepository.findBySprintId(
      sprintId
    );
  }
}

export default new ActivityService();