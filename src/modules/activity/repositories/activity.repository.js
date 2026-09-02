import { desc, eq } from "drizzle-orm";

import { db } from "../../../db/index.js";
import { activityLogs } from "../../../db/schema/activityLogs.schema.js";

class ActivityRepository {
  async create(data) {
    const [activity] = await db
      .insert(activityLogs)
      .values(data)
      .returning();

    return activity;
  }

  async findByTicketId(ticketId) {
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.ticketId, ticketId))
      .orderBy(desc(activityLogs.createdAt));
  }

  async findBySquadId(squadId) {
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.squadId, squadId))
      .orderBy(desc(activityLogs.createdAt));
  }

  async findBySprintId(sprintId) {
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.sprintId, sprintId))
      .orderBy(desc(activityLogs.createdAt));
  }
}

export default new ActivityRepository();