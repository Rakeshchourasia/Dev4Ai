import { eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { users } from "../../../db/schema/users.schema.js";
import { refreshTokens } from "../../../db/schema/refreshTokens.schema.js";

class AuthRepository {

  async findByEmail(email) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    return result[0] || null;
  }

  async findById(id) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id));

    return result[0] || null;
  }

  async createUser(userData) {
    const result = await db
      .insert(users)
      .values(userData)
      .returning();

    return result[0];
  }

  async updateUser(id, userData) {
    const result = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();

    return result[0];
  }

  async deleteUser(id) {
    const result = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning();

    return result[0];
  }

  async createRefreshToken(data) {
    const result = await db
      .insert(refreshTokens)
      .values(data)
      .returning();

    return result[0];
  }

  async findRefreshToken(token) {
    const result = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, token));

    return result[0] || null;
  }

  async deleteRefreshToken(token) {
    await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.token, token));
  }

  async deleteAllRefreshTokens(userId) {
    await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.userId, userId));
  }
  async createUser(userData) {
  const result = await db
    .insert(users)
    .values(userData)
    .returning();

  return result[0];
}
}



export default new AuthRepository();