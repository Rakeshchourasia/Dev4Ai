import { eq, count, desc } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { companies } from "../../../db/schema/companies.schema.js";

class CompanyRepository {
  async findAll({
    limit,
    offset,
  } = {}) {
    let query = db
      .select()
      .from(companies)
      .orderBy(desc(companies.createdAt));

    if (limit !== undefined) {
      query = query.limit(limit);
    }

    if (offset !== undefined) {
      query = query.offset(offset);
    }

    return await query;
  }

  async findById(id) {
    const result = await db
      .select()
      .from(companies)
      .where(eq(companies.id, id));

    return result[0] || null;
  }

  async findByName(name) {
    const result = await db
      .select()
      .from(companies)
      .where(eq(companies.name, name));

    return result[0] || null;
  }

  async create(companyData) {
    const result = await db
      .insert(companies)
      .values(companyData)
      .returning();

    return result[0];
  }

  async update(id, companyData) {
    const result = await db
      .update(companies)
      .set(companyData)
      .where(eq(companies.id, id))
      .returning();

    return result[0] || null;
  }

  async delete(id) {
    const result = await db
      .delete(companies)
      .where(eq(companies.id, id))
      .returning();

    return result[0] || null;
  }

  async countAll() {
    const result = await db
      .select({
        count: count(),
      })
      .from(companies);

    return Number(
      result[0]?.count || 0
    );
  }
}

export default new CompanyRepository();