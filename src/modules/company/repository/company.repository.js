import { eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { companies } from "../../../db/schema/companies.schema.js";

class CompanyRepository {
  async findAll() {
    return await db
      .select()
      .from(companies);
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
}

export default new CompanyRepository();