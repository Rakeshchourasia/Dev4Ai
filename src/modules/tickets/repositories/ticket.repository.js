
import {
  eq,
  and,
  count,
  asc,
  desc,
  sql,
} from "drizzle-orm";

import { db } from "../../../db/index.js";
import { tickets } from "../../../db/schema/tickets.schema.js";

class TicketRepository {
  // ==========================================
  // GET SORT ORDER
  // ==========================================

  getSortOrder(
    sortBy = "createdAt",
    sortOrder = "desc"
  ) {
    // ------------------------------------------
    // PRIORITY SORTING
    // LOW → MEDIUM → HIGH → URGENT
    // ------------------------------------------

    if (sortBy === "priority") {
      if (sortOrder === "asc") {
        return sql`
          CASE ${tickets.priority}
            WHEN 'LOW' THEN 1
            WHEN 'MEDIUM' THEN 2
            WHEN 'HIGH' THEN 3
            WHEN 'URGENT' THEN 4
          END ASC
        `;
      }

      return sql`
        CASE ${tickets.priority}
          WHEN 'URGENT' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          WHEN 'LOW' THEN 4
        END ASC
      `;
    }

    // ------------------------------------------
    // STATUS SORTING
    // TODO → IN_PROGRESS → DONE
    // ------------------------------------------

    if (sortBy === "status") {
      if (sortOrder === "asc") {
        return sql`
          CASE ${tickets.status}
            WHEN 'TODO' THEN 1
            WHEN 'IN_PROGRESS' THEN 2
            WHEN 'DONE' THEN 3
          END ASC
        `;
      }

      return sql`
        CASE ${tickets.status}
          WHEN 'DONE' THEN 1
          WHEN 'IN_PROGRESS' THEN 2
          WHEN 'TODO' THEN 3
        END ASC
      `;
    }

    // ------------------------------------------
    // NORMAL COLUMN SORTING
    // ------------------------------------------

    const sortColumns = {
      title: tickets.title,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
    };

    const sortColumn =
      sortColumns[sortBy] ||
      tickets.createdAt;

    return sortOrder === "asc"
      ? asc(sortColumn)
      : desc(sortColumn);
  }

  // ==========================================
  // GET TICKETS BY SPRINT
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

    // ------------------------------------------
    // STATUS FILTER
    // ------------------------------------------

    if (status) {
      conditions.push(
        eq(tickets.status, status)
      );
    }

    // ------------------------------------------
    // PRIORITY FILTER
    // ------------------------------------------

    if (priority) {
      conditions.push(
        eq(tickets.priority, priority)
      );
    }

    // ------------------------------------------
    // SORTING
    // ------------------------------------------

    const order =
      this.getSortOrder(
        sortBy,
        sortOrder
      );

    // ------------------------------------------
    // QUERY
    // ------------------------------------------

    return await db
      .select()
      .from(tickets)
      .where(and(...conditions))
      .orderBy(order)
      .limit(limit)
      .offset(offset);
  }

  // ==========================================
  // COUNT TICKETS BY SPRINT
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

    // Status filter
    if (status) {
      conditions.push(
        eq(tickets.status, status)
      );
    }

    // Priority filter
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

    return Number(
      result[0]?.count || 0
    );
  }

  // ==========================================
  // GET TICKETS BY SQUAD
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

    // ------------------------------------------
    // STATUS FILTER
    // ------------------------------------------

    if (status) {
      conditions.push(
        eq(tickets.status, status)
      );
    }

    // ------------------------------------------
    // PRIORITY FILTER
    // ------------------------------------------

    if (priority) {
      conditions.push(
        eq(tickets.priority, priority)
      );
    }

    // ------------------------------------------
    // SORTING
    // ------------------------------------------

    const order =
      this.getSortOrder(
        sortBy,
        sortOrder
      );

    // ------------------------------------------
    // QUERY
    // ------------------------------------------

    return await db
      .select()
      .from(tickets)
      .where(and(...conditions))
      .orderBy(order)
      .limit(limit)
      .offset(offset);
  }

  // ==========================================
  // COUNT TICKETS BY SQUAD
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

    // Status filter
    if (status) {
      conditions.push(
        eq(tickets.status, status)
      );
    }

    // Priority filter
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

    return Number(
      result[0]?.count || 0
    );
  }
}

export default new TicketRepository();

