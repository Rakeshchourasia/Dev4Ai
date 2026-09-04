import dashboardRepository from "../repositories/dashboard.repository.js";

import squadRepository from "../../squads/repositories/squad.repository.js";
import sprintRepository from "../../sprints/repositories/sprint.repository.js";
import squadMemberRepository from "../../squads/repositories/squadMember.repository.js";

import AppError from "../../../shared/errors/AppError.js";

class DashboardService {
  // ==========================================
  // ACCESS CONTROL
  // ==========================================

  async ensureSquadAccess(squadId, user) {
    if (!user) {
      throw new AppError(
        "Authentication required",
        401
      );
    }

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
        "You do not have access to this squad",
        403
      );
    }
  }

  // ==========================================
  // SQUAD DASHBOARD
  // ==========================================

  async getSquadDashboard(
    squadId,
    user
  ) {
    // ------------------------------------------
    // CHECK ACCESS
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
    // FETCH DASHBOARD DATA
    // ------------------------------------------

    const [
      tickets,
      priority,
      sprints,
      activeSprint,
      memberCount,
    ] = await Promise.all([
      dashboardRepository.getTicketSummaryBySquad(
        squadId
      ),

      dashboardRepository.getPrioritySummaryBySquad(
        squadId
      ),

      dashboardRepository.getSprintSummaryBySquad(
        squadId
      ),

      dashboardRepository.getActiveSprint(
        squadId
      ),

      dashboardRepository.getMemberCount(
        squadId
      ),
    ]);

    // ------------------------------------------
    // RESPONSE
    // ------------------------------------------

    return {
      squad: {
        id: squad.id,
        name: squad.name,
        memberCount,
      },

      tickets,

      priority,

      sprints,

      activeSprint: activeSprint
        ? {
            id: activeSprint.id,
            name: activeSprint.name,
            status: activeSprint.status,
            startDate: activeSprint.startDate,
            endDate: activeSprint.endDate,
          }
        : null,
    };
  }

  // ==========================================
  // SPRINT DASHBOARD
  // ==========================================

  async getSprintDashboard(
    sprintId,
    user
  ) {
    if (!user) {
      throw new AppError(
        "Authentication required",
        401
      );
    }

    // ------------------------------------------
    // FIND SPRINT
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
    // GET TICKET SUMMARY
    // ------------------------------------------

    const tickets =
      await dashboardRepository.getTicketSummaryBySprint(
        sprintId
      );

    // ------------------------------------------
    // CALCULATE PROGRESS
    // ------------------------------------------

    const progressPercentage =
      tickets.total === 0
        ? 0
        : Math.round(
            (tickets.done /
              tickets.total) *
              100
          );

    // ------------------------------------------
    // RETURN
    // ------------------------------------------

    return {
      sprint: {
        id: sprint.id,
        name: sprint.name,
        status: sprint.status,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
      },

      tickets,

      progressPercentage,
    };
  }
}

export default new DashboardService();