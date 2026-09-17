import {
  and,
  eq,
  desc,
  asc,
  count,
  getTableColumns,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "../../../db/index.js";
import { tickets } from "../../../db/schema/tickets.schema.js";
import { users } from "../../../db/schema/users.schema.js";

const createdByAlias = alias(users, "created_by_user");
const assignedToAlias = alias(users, "assigned_to_user");

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

    let query = db
      .select({
        ...getTableColumns(tickets),
        createdByUser: {
          id: createdByAlias.id,
          name: createdByAlias.name,
          email: createdByAlias.email,
        },
        assignedToUser: {
          id: assignedToAlias.id,
          name: assignedToAlias.name,
          email: assignedToAlias.email,
        }
      })
      .from(tickets)
      .leftJoin(createdByAlias, eq(tickets.createdBy, createdByAlias.id))
      .leftJoin(assignedToAlias, eq(tickets.assignedTo, assignedToAlias.id))
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

    const [result] = await db
      .select({
        count: count(),
      })
      .from(tickets)
      .where(
        and(...conditions)
      );

    return Number(
      result?.count || 0
    );
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

    let query = db
      .select({
        ...getTableColumns(tickets),
        createdByUser: {
          id: createdByAlias.id,
          name: createdByAlias.name,
          email: createdByAlias.email,
        },
        assignedToUser: {
          id: assignedToAlias.id,
          name: assignedToAlias.name,
          email: assignedToAlias.email,
        }
      })
      .from(tickets)
      .leftJoin(createdByAlias, eq(tickets.createdBy, createdByAlias.id))
      .leftJoin(assignedToAlias, eq(tickets.assignedTo, assignedToAlias.id))
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

    const [result] = await db
      .select({
        count: count(),
      })
      .from(tickets)
      .where(
        and(...conditions)
      );

    return Number(
      result?.count || 0
    );
  }

  // ==========================================
  // FIND BY ID
  // ==========================================

  async findById(
    id,
    database = db
  ) {
    const [ticket] =
      await database
        .select({
          ...getTableColumns(tickets),
          createdByUser: {
            id: createdByAlias.id,
            name: createdByAlias.name,
            email: createdByAlias.email,
          },
          assignedToUser: {
            id: assignedToAlias.id,
            name: assignedToAlias.name,
            email: assignedToAlias.email,
          }
        })
        .from(tickets)
        .leftJoin(createdByAlias, eq(tickets.createdBy, createdByAlias.id))
        .leftJoin(assignedToAlias, eq(tickets.assignedTo, assignedToAlias.id))
        .where(
          eq(
            tickets.id,
            id
          )
        )
        .limit(1);

    return ticket || null;
  }

  // ==========================================
  // CREATE
  // ==========================================

  async create(
    data,
    database = db
  ) {
    const [ticket] =
      await database
        .insert(tickets)
        .values(data)
        .returning();

    return ticket;
  }

  // ==========================================
  // UPDATE
  // ==========================================

  async update(
    id,
    data,
    database = db
  ) {
    const [ticket] =
      await database
        .update(tickets)
        .set(data)
        .where(
          eq(
            tickets.id,
            id
          )
        )
        .returning();

    return ticket || null;
  }

  // ==========================================
  // DELETE
  // ==========================================

  async delete(
    id,
    database = db
  ) {
    const [ticket] =
      await database
        .delete(tickets)
        .where(
          eq(
            tickets.id,
            id
          )
        )
        .returning();

    return ticket || null;
  }
}

export default new TicketRepository();