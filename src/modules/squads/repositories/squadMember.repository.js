import { and, eq } from "drizzle-orm";

import { db } from "../../../db/index.js";
import { squadMembers } from "../../../db/schema/squadMembers.schema.js";

class SquadMemberRepository {
  async addMember(squadId, userId) {
    const result = await db
      .insert(squadMembers)
      .values({
        squadId,
        userId,
      })
      .returning();

    return result[0];
  }

  async findMember(squadId, userId) {
    const result = await db
      .select()
      .from(squadMembers)
      .where(
        and(
          eq(squadMembers.squadId, squadId),
          eq(squadMembers.userId, userId)
        )
      );

    return result[0] || null;
  }

  async isMember(squadId, userId) {
    const member = await this.findMember(
      squadId,
      userId
    );

    return !!member;
  }

  async findAllMembers(squadId) {
    return await db
      .select()
      .from(squadMembers)
      .where(
        eq(squadMembers.squadId, squadId)
      );
  }

  async removeMember(squadId, userId) {
    await db
      .delete(squadMembers)
      .where(
        and(
          eq(squadMembers.squadId, squadId),
          eq(squadMembers.userId, userId)
        )
      );
  }
}

export default new SquadMemberRepository();