import {
  and,
  eq,
  desc,
  asc,
  count,
} from "drizzle-orm";

import { db } from "../../../db/index.js";
import { tickets } from "../../../db/schema/tickets.schema.js";

class TicketRepository {
  // ==========================================
  // FIND ALL BY SQUAD
  // ==========================================

  async findAllBySquadId(
    squadId,
    {
      limit,
      offset,
      status,
      priority,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = {}
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

    const sortColumns = {
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      title: tickets.title,
      priority: tickets.priority,
      status: tickets.status,
    };

    const sortColumn =
      sortColumns[sortBy] ||
      tickets.createdAt;

    const order =
      sortOrder === "asc"
        ? asc(sortColumn)
        : desc(sortColumn);

    return await db
      .select()
      .from(tickets)
      .where(and(...conditions))
      .orderBy(order)
      .limit(limit)
      .offset(offset);
  }

  // ==========================================
  // COUNT BY SQUAD
  // ==========================================

  async countBySquadId(
    squadId,
    {
      status,
      priority,
    } = {}
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

    const [result] = await db
      .select({
        count: count(),
      })
      .from(tickets)
      .where(and(...conditions));

    return Number(result.count);
  }

  // ==========================================
  // FIND ALL BY SPRINT
  // ==========================================

  async findAllBySprintId(
    sprintId,
    {
      limit,
      offset,
      status,
      priority,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = {}
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

    const sortColumns = {
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      title: tickets.title,
      priority: tickets.priority,
      status: tickets.status,
    };

    const sortColumn =
      sortColumns[sortBy] ||
      tickets.createdAt;

    const order =
      sortOrder === "asc"
        ? asc(sortColumn)
        : desc(sortColumn);

    return await db
      .select()
      .from(tickets)
      .where(and(...conditions))
      .orderBy(order)
      .limit(limit)
      .offset(offset);
  }

  // ==========================================
  // COUNT BY SPRINT
  // ==========================================

  async countBySprintId(
    sprintId,
    {
      status,
      priority,
    } = {}
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

    const [result] = await db
      .select({
        count: count(),
      })
      .from(tickets)
      .where(and(...conditions));

    return Number(result.count);
  }

  // ==========================================
  // FIND BY ID
  // ==========================================

  async findById(id) {
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, id))
      .limit(1);

    return ticket || null;
  }

  // ==========================================
  // CREATE
  // ==========================================

  async create(data) {
    const [ticket] = await db
      .insert(tickets)
      .values(data)
      .returning();

    return ticket;
  }

  // ==========================================
  // UPDATE
  // ==========================================

  async update(id, data) {
    const [ticket] = await db
      .update(tickets)
      .set(data)
      .where(eq(tickets.id, id))
      .returning();

    return ticket || null;
  }

  // ==========================================
  // DELETE
  // ==========================================

  async delete(id) {
    const [ticket] = await db
      .delete(tickets)
      .where(eq(tickets.id, id))
      .returning();

    return ticket || null;
  }
}

export default new TicketRepository();