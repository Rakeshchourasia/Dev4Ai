import {
  eq,
  and,
  count,
  asc,
  desc,
  lt,
  gt,
  ne,
} from "drizzle-orm";

import { db } from "../../../db/index.js";
import { sprints } from "../../../db/schema/sprints.schema.js";

class SprintRepository {
  async findAllBySquadId(
    squadId,
    {
      limit,
      offset,
      status,
      sortBy = "startDate",
      sortOrder = "asc",
    } = {}
  ) {
    const conditions = [
      eq(sprints.squadId, squadId),
    ];

    if (status) {
      conditions.push(
        eq(sprints.status, status)
      );
    }

    const sortColumns = {
      name: sprints.name,
      startDate: sprints.startDate,
      endDate: sprints.endDate,
      createdAt: sprints.createdAt,
      updatedAt: sprints.updatedAt,
    };

    const sortColumn =
      sortColumns[sortBy] ||
      sprints.startDate;

    const order =
      sortOrder === "desc"
        ? desc(sortColumn)
        : asc(sortColumn);

    return await db
      .select()
      .from(sprints)
      .where(and(...conditions))
      .orderBy(order)
      .limit(limit)
      .offset(offset);
  }

  async countBySquadId(
    squadId,
    { status } = {}
  ) {
    const conditions = [
      eq(sprints.squadId, squadId),
    ];

    if (status) {
      conditions.push(
        eq(sprints.status, status)
      );
    }

    const result = await db
      .select({
        count: count(),
      })
      .from(sprints)
      .where(and(...conditions));

    return Number(result[0]?.count || 0);
  }

  async findById(id) {
    const result = await db
      .select()
      .from(sprints)
      .where(eq(sprints.id, id));

    return result[0] || null;
  }

  async create(sprintData) {
    const result = await db
      .insert(sprints)
      .values(sprintData)
      .returning();

    return result[0];
  }

  async update(id, sprintData) {
    const result = await db
      .update(sprints)
      .set(sprintData)
      .where(eq(sprints.id, id))
      .returning();

    return result[0] || null;
  }

  async delete(id) {
    const result = await db
      .delete(sprints)
      .where(eq(sprints.id, id))
      .returning();

    return result[0] || null;
  }

  async findOverlappingSprint(
    squadId,
    startDate,
    endDate,
    excludeId = null
  ) {
    const conditions = [
      eq(sprints.squadId, squadId),
      lt(sprints.startDate, endDate),
      gt(sprints.endDate, startDate),
    ];

    if (excludeId) {
      conditions.push(
        ne(sprints.id, excludeId)
      );
    }

    const result = await db
      .select()
      .from(sprints)
      .where(and(...conditions));

    return result[0] || null;
  }

  async findActiveSprintBySquadId(
    squadId,
    excludeId = null
  ) {
    const conditions = [
      eq(sprints.squadId, squadId),
      eq(sprints.status, "ACTIVE"),
    ];

    if (excludeId) {
      conditions.push(
        ne(sprints.id, excludeId)
      );
    }

    const result = await db
      .select()
      .from(sprints)
      .where(and(...conditions))
      .limit(1);

    return result[0] || null;
  }

}

export default new SprintRepository();