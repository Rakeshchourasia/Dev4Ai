import { eq, and } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { ticketGithubPullRequests } from "../../../db/schema/ticketGithubPullRequests.schema.js";

class TicketGithubPrRepository {
  /**
   * Find all linked GitHub PRs for a DEVAI ticket.
   */
  async findAllByTicketId(ticketId, database = db) {
    return await database
      .select()
      .from(ticketGithubPullRequests)
      .where(eq(ticketGithubPullRequests.ticketId, ticketId));
  }

  /**
   * Find a specific linked PR for a ticket by repository ID and PR ID.
   */
  async findByTicketAndPrId(ticketId, githubRepositoryId, githubPrId, database = db) {
    const [record] = await database
      .select()
      .from(ticketGithubPullRequests)
      .where(
        and(
          eq(ticketGithubPullRequests.ticketId, ticketId),
          eq(ticketGithubPullRequests.githubRepositoryId, String(githubRepositoryId)),
          eq(ticketGithubPullRequests.githubPrId, String(githubPrId))
        )
      )
      .limit(1);

    return record || null;
  }

  /**
   * Create a new ticket <-> GitHub PR link.
   */
  async create(data, database = db) {
    const [record] = await database
      .insert(ticketGithubPullRequests)
      .values({
        ticketId: data.ticketId,
        githubRepositoryId: String(data.githubRepositoryId),
        githubPrId: String(data.githubPrId),
        githubPrNumber: Number(data.githubPrNumber),
        githubPrUrl: data.githubPrUrl,
        state: data.state,
      })
      .returning();

    return record;
  }

  /**
   * Remove a linked GitHub PR mapping by its record ID.
   */
  async deleteById(id, database = db) {
    const [record] = await database
      .delete(ticketGithubPullRequests)
      .where(eq(ticketGithubPullRequests.id, id))
      .returning();

    return record || null;
  }

  /**
   * Find all linked PR records across tickets by repository ID and PR ID.
   */
  async findAllByRepoAndPrId(githubRepositoryId, githubPrId, database = db) {
    return await database
      .select()
      .from(ticketGithubPullRequests)
      .where(
        and(
          eq(ticketGithubPullRequests.githubRepositoryId, String(githubRepositoryId)),
          eq(ticketGithubPullRequests.githubPrId, String(githubPrId))
        )
      );
  }

  /**
   * Update PR state.
   */
  async updateState(id, state, database = db) {
    const [record] = await database
      .update(ticketGithubPullRequests)
      .set({
        state,
        updatedAt: new Date(),
      })
      .where(eq(ticketGithubPullRequests.id, id))
      .returning();

    return record || null;
  }
}


export default new TicketGithubPrRepository();
