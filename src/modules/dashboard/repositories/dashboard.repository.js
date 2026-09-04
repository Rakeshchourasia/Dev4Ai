import { and, eq, sql } from "drizzle-orm";

import { db } from "../../../db/index.js";

import { tickets } from "../../../db/schema/tickets.schema.js";
import { sprints } from "../../../db/schema/sprints.schema.js";
import { squadMembers } from "../../../db/schema/squadMembers.schema.js";

class DashboardRepository {
  // ==========================================
  // TICKET SUMMARY BY SQUAD
  // ==========================================

  async getTicketSummaryBySquad(squadId) {
    const [result] = await db
      .select({
        total: sql`count(*)`,

        todo: sql`
          count(*) filter (
            where ${tickets.status} = 'TODO'
          )
        `,

        inProgress: sql`
          count(*) filter (
            where ${tickets.status} = 'IN_PROGRESS'
          )
        `,

        done: sql`
          count(*) filter (
            where ${tickets.status} = 'DONE'
          )
        `,
      })
      .from(tickets)
      .where(eq(tickets.squadId, squadId));

    return {
      total: Number(result.total),
      todo: Number(result.todo),
      inProgress: Number(result.inProgress),
      done: Number(result.done),
    };
  }

  // ==========================================
  // PRIORITY SUMMARY
  // ==========================================

  async getPrioritySummaryBySquad(squadId) {
    const [result] = await db
      .select({
        low: sql`
          count(*) filter (
            where ${tickets.priority} = 'LOW'
          )
        `,

        medium: sql`
          count(*) filter (
            where ${tickets.priority} = 'MEDIUM'
          )
        `,

        high: sql`
          count(*) filter (
            where ${tickets.priority} = 'HIGH'
          )
        `,

        urgent: sql`
          count(*) filter (
            where ${tickets.priority} = 'URGENT'
          )
        `,
      })
      .from(tickets)
      .where(eq(tickets.squadId, squadId));

    return {
      low: Number(result.low),
      medium: Number(result.medium),
      high: Number(result.high),
      urgent: Number(result.urgent),
    };
  }

  // ==========================================
  // SPRINT SUMMARY
  // ==========================================

  async getSprintSummaryBySquad(squadId) {
    const [result] = await db
      .select({
        planned: sql`
          count(*) filter (
            where ${sprints.status} = 'PLANNED'
          )
        `,

        active: sql`
          count(*) filter (
            where ${sprints.status} = 'ACTIVE'
          )
        `,

        completed: sql`
          count(*) filter (
            where ${sprints.status} = 'COMPLETED'
          )
        `,
      })
      .from(sprints)
      .where(eq(sprints.squadId, squadId));

    return {
      planned: Number(result.planned),
      active: Number(result.active),
      completed: Number(result.completed),
    };
  }

  // ==========================================
  // ACTIVE SPRINT
  // ==========================================

  async getActiveSprint(squadId) {
    const [sprint] = await db
      .select()
      .from(sprints)
      .where(
        and(
          eq(sprints.squadId, squadId),
          eq(sprints.status, "ACTIVE")
        )
      )
      .limit(1);

    return sprint || null;
  }

  // ==========================================
  // SPRINT TICKET SUMMARY
  // ==========================================

  async getTicketSummaryBySprint(sprintId) {
    const [result] = await db
      .select({
        total: sql`count(*)`,

        todo: sql`
          count(*) filter (
            where ${tickets.status} = 'TODO'
          )
        `,

        inProgress: sql`
          count(*) filter (
            where ${tickets.status} = 'IN_PROGRESS'
          )
        `,

        done: sql`
          count(*) filter (
            where ${tickets.status} = 'DONE'
          )
        `,
      })
      .from(tickets)
      .where(eq(tickets.sprintId, sprintId));

    return {
      total: Number(result.total),
      todo: Number(result.todo),
      inProgress: Number(result.inProgress),
      done: Number(result.done),
    };
  }

  // ==========================================
  // SQUAD MEMBER COUNT
  // ==========================================

  async getMemberCount(squadId) {
    const [result] = await db
      .select({
        count: sql`count(*)`,
      })
      .from(squadMembers)
      .where(eq(squadMembers.squadId, squadId));

    return Number(result.count);
  }
}

export default new DashboardRepository();