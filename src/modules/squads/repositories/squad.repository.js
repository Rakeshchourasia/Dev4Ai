import {
  eq,
  and,
  count,
  asc,
  desc,
} from "drizzle-orm";

import { db } from "../../../db/index.js";
import { squads } from "../../../db/schema/squads.schema.js";
import { squadMembers } from "../../../db/schema/squadMembers.schema.js";

class SquadRepository {
  // ==========================================
  // GET SQUADS BY COMPANY - PAGINATED
  // ==========================================

  async findAllByCompanyId(
    companyId,
    {
      limit,
      offset,
      sortBy = "createdAt",
      sortOrder = "desc",
      userId,
    } = {}
  ) {
    const sortColumns = {
      name: squads.name,
      createdAt: squads.createdAt,
      updatedAt: squads.updatedAt,
    };

    const sortColumn =
      sortColumns[sortBy] ||
      squads.createdAt;

    const order =
      sortOrder === "asc"
        ? asc(sortColumn)
        : desc(sortColumn);

    let query = db
      .select({
        id: squads.id,
        companyId: squads.companyId,
        name: squads.name,
        createdAt: squads.createdAt,
        updatedAt: squads.updatedAt,
      })
      .from(squads);

    if (userId) {
      query = query
        .innerJoin(
          squadMembers,
          eq(squadMembers.squadId, squads.id)
        )
        .where(
          and(
            eq(squads.companyId, companyId),
            eq(squadMembers.userId, userId)
          )
        );
    } else {
      query = query.where(eq(squads.companyId, companyId));
    }

    return await query
      .orderBy(order)
      .limit(limit)
      .offset(offset);
  }

  // ==========================================
  // COUNT SQUADS BY COMPANY
  // ==========================================

  async countByCompanyId(companyId, userId) {
    let query = db
      .select({
        count: count(),
      })
      .from(squads);

    if (userId) {
      query = query
        .innerJoin(
          squadMembers,
          eq(squadMembers.squadId, squads.id)
        )
        .where(
          and(
            eq(squads.companyId, companyId),
            eq(squadMembers.userId, userId)
          )
        );
    } else {
      query = query.where(eq(squads.companyId, companyId));
    }

    const result = await query;
    return Number(
      result[0]?.count || 0
    );
  }

  // ==========================================
  // GET SQUAD BY ID
  // ==========================================

  async findById(id) {
    const result = await db
      .select()
      .from(squads)
      .where(
        eq(squads.id, id)
      );

    return result[0] || null;
  }

  // ==========================================
  // CREATE SQUAD
  // ==========================================

  async create(squadData) {
    const result = await db
      .insert(squads)
      .values(squadData)
      .returning();

    return result[0];
  }

  // ==========================================
  // UPDATE SQUAD
  // ==========================================

  async update(id, squadData) {
    const result = await db
      .update(squads)
      .set({
        ...squadData,
        updatedAt: new Date(),
      })
      .where(
        eq(squads.id, id)
      )
      .returning();

    return result[0] || null;
  }

  // ==========================================
  // DELETE SQUAD
  // ==========================================

  async delete(id) {
    const result = await db
      .delete(squads)
      .where(
        eq(squads.id, id)
      )
      .returning();

    return result[0] || null;
  }
}

export default new SquadRepository();