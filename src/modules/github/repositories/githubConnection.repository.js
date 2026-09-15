import { eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { githubConnections } from "../../../db/schema/githubConnections.schema.js";

class GithubConnectionRepository {
  // ==========================================
  // FIND BY DEVAI USER ID
  // ==========================================

  async findByUserId(userId, database = db) {
    const result = await database
      .select()
      .from(githubConnections)
      .where(eq(githubConnections.userId, userId))
      .limit(1);

    return result[0] || null;
  }

  // ==========================================
  // FIND BY GITHUB USER ID
  // ==========================================

  async findByGithubUserId(githubUserId, database = db) {
    const result = await database
      .select()
      .from(githubConnections)
      .where(eq(githubConnections.githubUserId, String(githubUserId)))
      .limit(1);

    return result[0] || null;
  }

  // ==========================================
  // UPSERT (INSERT OR UPDATE ON CONFLICT)
  // ==========================================

  /**
   * Inserts a new GitHub connection or updates the existing one for this user.
   * Uses ON CONFLICT on userId to handle the upsert.
   *
   * @param {object} data
   * @param {string} data.userId
   * @param {string} data.githubUserId
   * @param {string} data.githubUsername
   * @param {string} data.accessTokenEncrypted
   * @param {string|null} data.refreshTokenEncrypted
   * @param {Date|null}   data.accessTokenExpiresAt
   * @param {Date|null}   data.refreshTokenExpiresAt
   * @param {string|null} data.scopes
   * @param {object}      database — drizzle db or transaction
   */
  async upsert(data, database = db) {
    const now = new Date();

    const [record] = await database
      .insert(githubConnections)
      .values({
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: githubConnections.userId,
        set: {
          githubUserId: data.githubUserId,
          githubUsername: data.githubUsername,
          accessTokenEncrypted: data.accessTokenEncrypted,
          refreshTokenEncrypted: data.refreshTokenEncrypted ?? null,
          accessTokenExpiresAt: data.accessTokenExpiresAt ?? null,
          refreshTokenExpiresAt: data.refreshTokenExpiresAt ?? null,
          scopes: data.scopes ?? null,
          updatedAt: now,
        },
      })
      .returning();

    return record;
  }

  // ==========================================
  // DELETE BY DEVAI USER ID
  // ==========================================

  async deleteByUserId(userId, database = db) {
    const [deleted] = await database
      .delete(githubConnections)
      .where(eq(githubConnections.userId, userId))
      .returning();

    return deleted || null;
  }
}

export default new GithubConnectionRepository();
