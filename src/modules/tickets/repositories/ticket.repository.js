import {
  eq,
  and,
  count,
} from "drizzle-orm";

import { db } from "../../../db/index.js";
import { tickets } from "../../../db/schema/tickets.schema.js";

class TicketRepository {
  async findAllBySprintId(
    sprintId,
    { limit, offset, status, priority } = {}
  ) {
    const conditions = [
      eq(tickets.sprintId, sprintId),
    ];

    if (status) {
      conditions.push(
        eq(tickets.status, status)
      );
    }

    if (priority) {
      conditions.push(
        eq(tickets.priority, priority)
      );
    }

    return await db
      .select()
      .from(tickets)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);
  }

  async countBySprintId(
    sprintId,
    { status, priority } = {}
  ) {
    const conditions = [
      eq(tickets.sprintId, sprintId),
    ];

    if (status) {
      conditions.push(
        eq(tickets.status, status)
      );
    }

    if (priority) {
      conditions.push(
        eq(tickets.priority, priority)
      );
    }

    const result = await db
      .select({
        count: count(),
      })
      .from(tickets)
      .where(and(...conditions));

    return Number(result[0]?.count || 0);
  }

  async findAllBySquadId(
    squadId,
    { limit, offset, status, priority } = {}
  ) {
    const conditions = [
      eq(tickets.squadId, squadId),
    ];

    if (status) {
      conditions.push(
        eq(tickets.status, status)
      );
    }

    if (priority) {
      conditions.push(
        eq(tickets.priority, priority)
      );
    }

    return await db
      .select()
      .from(tickets)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);
  }

  async countBySquadId(
    squadId,
    { status, priority } = {}
  ) {
    const conditions = [
      eq(tickets.squadId, squadId),
    ];

    if (status) {
      conditions.push(
        eq(tickets.status, status)
      );
    }

    if (priority) {
      conditions.push(
        eq(tickets.priority, priority)
      );
    }

    const result = await db
      .select({
        count: count(),
      })
      .from(tickets)
      .where(and(...conditions));

    return Number(result[0]?.count || 0);
  }
}

export default new TicketRepository();