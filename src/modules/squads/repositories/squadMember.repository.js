import {
  and,
  eq,
} from "drizzle-orm";

import { db } from "../../../db/index.js";

import {
  squadMembers,
} from "../../../db/schema/squadMembers.schema.js";

import {
  users,
} from "../../../db/schema/users.schema.js";

class SquadMemberRepository {
  // ==========================================
  // ADD MEMBER
  // ==========================================

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

  // ==========================================
  // FIND MEMBERSHIP
  // ==========================================

  async findMember(squadId, userId) {
    const result = await db
      .select()
      .from(squadMembers)
      .where(
        and(
          eq(
            squadMembers.squadId,
            squadId
          ),
          eq(
            squadMembers.userId,
            userId
          )
        )
      );

    return result[0] || null;
  }

  // ==========================================
  // CHECK MEMBERSHIP
  // ==========================================

  async isMember(squadId, userId) {
    const member =
      await this.findMember(
        squadId,
        userId
      );

    return Boolean(member);
  }

  // ==========================================
  // GET ALL MEMBERS
  // ==========================================

  async findAllMembers(squadId) {
    return await db
      .select({
        squadId: squadMembers.squadId,
        userId: squadMembers.userId,
        joinedAt: squadMembers.createdAt,

        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        },
      })
      .from(squadMembers)
      .innerJoin(
        users,
        eq(
          squadMembers.userId,
          users.id
        )
      )
      .where(
        eq(
          squadMembers.squadId,
          squadId
        )
      );
  }

  // ==========================================
  // REMOVE MEMBER
  // ==========================================

  async removeMember(squadId, userId) {
    const result = await db
      .delete(squadMembers)
      .where(
        and(
          eq(
            squadMembers.squadId,
            squadId
          ),
          eq(
            squadMembers.userId,
            userId
          )
        )
      )
      .returning();

    return result[0] || null;
  }
}

export default new SquadMemberRepository();