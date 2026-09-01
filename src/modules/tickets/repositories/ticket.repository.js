import {
  eq,
  and,
  count,
  asc,
  desc,
} from "drizzle-orm";

import { db } from "../../../db/index.js";

import {
  tickets,
} from "../../../db/schema/tickets.schema.js";

class TicketRepository {
  // ==========================================
  // FIND BY ID
  // ==========================================

  async findById(id) {
    const result = await db
      .select()
      .from(tickets)
      .where(
        eq(tickets.id, id)
      )
      .limit(1);

    return result[0] || null;
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
      eq(
        tickets.sprintId,
        sprintId
      ),
    ];

    if (status) {
      conditions.push(
        eq(
          tickets.status,
          status
        )
      );
    }

    if (priority) {
      conditions.push(
        eq(
          tickets.priority,
          priority
        )
      );
    }

    const sortColumns = {
      title: tickets.title,
      priority: tickets.priority,
      status: tickets.status,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
    };

    const sortColumn =
      sortColumns[sortBy] ||
      tickets.createdAt;

    const order =
      sortOrder === "asc"
        ? asc(sortColumn)
        : desc(sortColumn);

    let query = db
      .select()
      .from(tickets)
      .where(
        and(...conditions)
      )
      .orderBy(order);

    if (
      limit !== undefined &&
      offset !== undefined
    ) {
      query = query
        .limit(limit)
        .offset(offset);
    }

    return await query;
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
      eq(
        tickets.sprintId,
        sprintId
      ),
    ];

    if (status) {
      conditions.push(
        eq(
          tickets.status,
          status
        )
      );
    }

    if (priority) {
      conditions.push(
        eq(
          tickets.priority,
          priority
        )
      );
    }

    const result = await db
      .select({
        count: count(),
      })
      .from(tickets)
      .where(
        and(...conditions)
      );

    return Number(
      result[0]?.count || 0
    );
  }

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
      eq(
        tickets.squadId,
        squadId
      ),
    ];

    if (status) {
      conditions.push(
        eq(
          tickets.status,
          status
        )
      );
    }

    if (priority) {
      conditions.push(
        eq(
          tickets.priority,
          priority
        )
      );
    }

    const sortColumns = {
      title: tickets.title,
      priority: tickets.priority,
      status: tickets.status,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
    };

    const sortColumn =
      sortColumns[sortBy] ||
      tickets.createdAt;

    const order =
      sortOrder === "asc"
        ? asc(sortColumn)
        : desc(sortColumn);

    let query = db
      .select()
      .from(tickets)
      .where(
        and(...conditions)
      )
      .orderBy(order);

    if (
      limit !== undefined &&
      offset !== undefined
    ) {
      query = query
        .limit(limit)
        .offset(offset);
    }

    return await query;
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
      eq(
        tickets.squadId,
        squadId
      ),
    ];

    if (status) {
      conditions.push(
        eq(
          tickets.status,
          status
        )
      );
    }

    if (priority) {
      conditions.push(
        eq(
          tickets.priority,
          priority
        )
      );
    }

    const result = await db
      .select({
        count: count(),
      })
      .from(tickets)
      .where(
        and(...conditions)
      );

    return Number(
      result[0]?.count || 0
    );
  }

  // ==========================================
  // CREATE
  // ==========================================

  async create(ticketData) {
    const result = await db
      .insert(tickets)
      .values(ticketData)
      .returning();

    return result[0];
  }

  // ==========================================
  // UPDATE
  // ==========================================

  async update(
    id,
    ticketData
  ) {
    const result = await db
      .update(tickets)
      .set(ticketData)
      .where(
        eq(tickets.id, id)
      )
      .returning();

    return result[0] || null;
  }

  // ==========================================
  // DELETE
  // ==========================================

  async delete(id) {
    const result = await db
      .delete(tickets)
      .where(
        eq(tickets.id, id)
      )
      .returning();

    return result[0] || null;
  }
}

export default new TicketRepository();