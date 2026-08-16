import {
  eq,
  and,
  lt,
  gt,
  ne,
} from "drizzle-orm";

import { db } from "../../../db/index.js";
import { sprints } from "../../../db/schema/sprints.schema.js";

class SprintRepository {
  async findAllBySquadId(squadId) {
    return await db
      .select()
      .from(sprints)
      .where(eq(sprints.squadId, squadId));
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
}

export default new SprintRepository();