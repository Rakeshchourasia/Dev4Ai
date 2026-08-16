import { eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { tickets } from "../../../db/schema/tickets.schema.js";

class TicketRepository {
  async findAllBySprintId(sprintId) {
    return await db
      .select()
      .from(tickets)
      .where(eq(tickets.sprintId, sprintId));
  }

  async findAllBySquadId(squadId) {
    return await db
      .select()
      .from(tickets)
      .where(eq(tickets.squadId, squadId));
  }

  async findById(id) {
    const result = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, id));

    return result[0] || null;
  }

  async create(ticketData) {
    const result = await db
      .insert(tickets)
      .values(ticketData)
      .returning();

    return result[0];
  }

  async update(id, ticketData) {
    const result = await db
      .update(tickets)
      .set(ticketData)
      .where(eq(tickets.id, id))
      .returning();

    return result[0] || null;
  }

  async delete(id) {
    const result = await db
      .delete(tickets)
      .where(eq(tickets.id, id))
      .returning();

    return result[0] || null;
  }
}

export default new TicketRepository();