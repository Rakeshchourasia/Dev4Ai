import {
  eq,
  and,
  ne,
  count,
  asc,
  desc,
  lt,
  gt,
} from "drizzle-orm";

import { db } from "../../../db/index.js";

import {
  sprints,
} from "../../../db/schema/sprints.schema.js";

class SprintRepository {
  // ==========================================
  // FIND BY ID
  // ==========================================

  async findById(
    id,
    database = db
  ) {
    const result =
      await database
        .select()
        .from(sprints)
        .where(
          eq(
            sprints.id,
            id
          )
        )
        .limit(1);

    return result[0] || null;
  }

  // ==========================================
  // FIND ACTIVE BY SQUAD
  // ==========================================

  async findActiveBySquadId(
    squadId,
    database = db
  ) {
    const result =
      await database
        .select()
        .from(sprints)
        .where(
          and(
            eq(sprints.squadId, squadId),
            eq(sprints.status, "ACTIVE")
          )
        )
        .limit(1);

    return result[0] || null;
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
      sortBy = "createdAt",
      sortOrder = "desc",
    } = {}
  ) {
    const conditions = [
      eq(
        sprints.squadId,
        squadId
      ),
    ];

    if (status) {
      conditions.push(
        eq(
          sprints.status,
          status
        )
      );
    }

    const sortColumns = {
      name:
        sprints.name,

      startDate:
        sprints.startDate,

      endDate:
        sprints.endDate,

      status:
        sprints.status,

      createdAt:
        sprints.createdAt,

      updatedAt:
        sprints.updatedAt,
    };

    const sortColumn =
      sortColumns[sortBy] ||
      sprints.createdAt;

    const order =
      sortOrder === "asc"
        ? asc(sortColumn)
        : desc(sortColumn);

    let query = db
      .select()
      .from(sprints)
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
  // COUNT
  // ==========================================

  async countBySquadId(
    squadId,
    {
      status,
    } = {}
  ) {
    const conditions = [
      eq(
        sprints.squadId,
        squadId
      ),
    ];

    if (status) {
      conditions.push(
        eq(
          sprints.status,
          status
        )
      );
    }

    const [result] =
      await db
        .select({
          count:
            count(),
        })
        .from(sprints)
        .where(
          and(...conditions)
        );

    return Number(
      result?.count || 0
    );
  }

  // ==========================================
  // FIND OVERLAPPING SPRINT
  // ==========================================

  async findOverlappingSprint(
    squadId,
    startDate,
    endDate,
    excludeId = null
  ) {
    const conditions = [
      eq(
        sprints.squadId,
        squadId
      ),

      lt(
        sprints.startDate,
        endDate
      ),

      gt(
        sprints.endDate,
        startDate
      ),
    ];

    if (excludeId) {
      conditions.push(
        ne(
          sprints.id,
          excludeId
        )
      );
    }

    const result =
      await db
        .select()
        .from(sprints)
        .where(
          and(...conditions)
        )
        .limit(1);

    return result[0] || null;
  }

  // ==========================================
  // CREATE
  // ==========================================

  async create(
    sprintData,
    database = db
  ) {
    const [sprint] =
      await database
        .insert(sprints)
        .values(
          sprintData
        )
        .returning();

    return sprint;
  }

  // ==========================================
  // UPDATE
  // ==========================================

  async update(
    id,
    sprintData,
    database = db
  ) {
    const [sprint] =
      await database
        .update(sprints)
        .set(
          sprintData
        )
        .where(
          eq(
            sprints.id,
            id
          )
        )
        .returning();

    return sprint || null;
  }

  // ==========================================
  // DELETE
  // ==========================================

  async delete(
    id,
    database = db
  ) {
    const [sprint] =
      await database
        .delete(sprints)
        .where(
          eq(
            sprints.id,
            id
          )
        )
        .returning();

    return sprint || null;
  }
}

export default new SprintRepository();