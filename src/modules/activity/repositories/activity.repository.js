import { desc, eq } from "drizzle-orm";

import { db } from "../../../db/index.js";
import { activityLogs } from "../../../db/schema/activityLogs.schema.js";

class ActivityRepository {
  // ==========================================
  // CREATE
  // Supports normal DB connection or transaction
  // ==========================================

  async create(data, database = db) {
    const [activity] = await database
      .insert(activityLogs)
      .values(data)
      .returning();

    return activity;
  }

  // ==========================================
  // FIND BY TICKET
  // ==========================================

  async findByTicketId(ticketId) {
    return await db
      .select()
      .from(activityLogs)
      .where(
        eq(
          activityLogs.ticketId,
          ticketId
        )
      )
      .orderBy(
        desc(activityLogs.createdAt)
      );
  }

  // ==========================================
  // FIND BY SQUAD
  // ==========================================

  async findBySquadId(squadId) {
    return await db
      .select()
      .from(activityLogs)
      .where(
        eq(
          activityLogs.squadId,
          squadId
        )
      )
      .orderBy(
        desc(activityLogs.createdAt)
      );
  }

  // ==========================================
  // FIND BY SPRINT
  // ==========================================

  async findBySprintId(sprintId) {
    return await db
      .select()
      .from(activityLogs)
      .where(
        eq(
          activityLogs.sprintId,
          sprintId
        )
      )
      .orderBy(
        desc(activityLogs.createdAt)
      );
  }
}

export default new ActivityRepository();