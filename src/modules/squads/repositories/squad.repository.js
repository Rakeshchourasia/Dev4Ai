import {
  eq,
  count,
  asc,
  desc,
} from "drizzle-orm";

import { db } from "../../../db/index.js";
import { squads } from "../../../db/schema/squads.schema.js";

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

  return await db
    .select()
    .from(squads)
    .where(
      eq(
        squads.companyId,
        companyId
      )
    )
    .orderBy(order)
    .limit(limit)
    .offset(offset);
}
  // ==========================================
  // COUNT SQUADS BY COMPANY
  // ==========================================

  async countByCompanyId(companyId) {
    const result = await db
      .select({
        count: count(),
      })
      .from(squads)
      .where(
        eq(squads.companyId, companyId)
      );

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