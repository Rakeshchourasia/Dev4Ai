import { and, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { userAuthAccounts } from "../../../db/schema/userAuthAccounts.schema.js";

class UserAuthAccountRepository {
  async findByProviderAccount(provider, providerAccountId, database = db) {
    const result = await database
      .select()
      .from(userAuthAccounts)
      .where(
        and(
          eq(userAuthAccounts.provider, provider),
          eq(userAuthAccounts.providerAccountId, String(providerAccountId))
        )
      )
      .limit(1);

    return result[0] || null;
  }

  async findByUserId(userId, database = db) {
    return await database
      .select()
      .from(userAuthAccounts)
      .where(eq(userAuthAccounts.userId, userId));
  }

  async create(accountData, database = db) {
    const [account] = await database
      .insert(userAuthAccounts)
      .values({
        ...accountData,
        providerAccountId: String(accountData.providerAccountId),
      })
      .returning();

    return account;
  }

  async deleteByProviderAccount(provider, providerAccountId, database = db) {
    const [deleted] = await database
      .delete(userAuthAccounts)
      .where(
        and(
          eq(userAuthAccounts.provider, provider),
          eq(userAuthAccounts.providerAccountId, String(providerAccountId))
        )
      )
      .returning();

    return deleted || null;
  }
}

export default new UserAuthAccountRepository();
