import { eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { squads } from "../../../db/schema/squads.schema.js";

class SquadRepository {
  async findAllByCompanyId(companyId) {
    return await db
      .select()
      .from(squads)
      .where(eq(squads.companyId, companyId));
  }

  async findById(id) {
    const result = await db
      .select()
      .from(squads)
      .where(eq(squads.id, id));

    return result[0] || null;
  }

  async create(squadData) {
    const result = await db
      .insert(squads)
      .values(squadData)
      .returning();

    return result[0];
  }

  async update(id, squadData) {
    const result = await db
      .update(squads)
      .set(squadData)
      .where(eq(squads.id, id))
      .returning();

    return result[0] || null;
  }

  async delete(id) {
    const result = await db
      .delete(squads)
      .where(eq(squads.id, id))
      .returning();

    return result[0] || null;
  }
}

export default new SquadRepository();