import { eq, and } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { ticketGithubIssues } from "../../../db/schema/ticketGithubIssues.schema.js";

class TicketGithubIssueRepository {
  /**
   * Find linked GitHub issue by DEVAI ticket ID.
   */
  async findByTicketId(ticketId, database = db) {
    const [record] = await database
      .select()
      .from(ticketGithubIssues)
      .where(eq(ticketGithubIssues.ticketId, ticketId))
      .limit(1);

    return record || null;
  }

  /**
   * Find linked GitHub issue by repository ID and issue ID (unique pair).
   */
  async findByRepoAndIssueId(githubRepositoryId, githubIssueId, database = db) {
    const [record] = await database
      .select()
      .from(ticketGithubIssues)
      .where(
        and(
          eq(ticketGithubIssues.githubRepositoryId, String(githubRepositoryId)),
          eq(ticketGithubIssues.githubIssueId, String(githubIssueId))
        )
      )
      .limit(1);

    return record || null;
  }

  /**
   * Create a new ticket <-> GitHub issue link.
   */
  async create(data, database = db) {
    const [record] = await database
      .insert(ticketGithubIssues)
      .values({
        ticketId: data.ticketId,
        githubRepositoryId: String(data.githubRepositoryId),
        githubIssueId: String(data.githubIssueId),
        githubIssueNumber: Number(data.githubIssueNumber),
        githubIssueUrl: data.githubIssueUrl,
        githubIssueState: data.githubIssueState,
      })
      .returning();

    return record;
  }

  /**
   * Remove a linked GitHub issue mapping by ticket ID.
   */
  async deleteByTicketId(ticketId, database = db) {
    const [record] = await database
      .delete(ticketGithubIssues)
      .where(eq(ticketGithubIssues.ticketId, ticketId))
      .returning();

    return record || null;
  }

  /**
   * Update issue state on GitHub sync.
   */
  async updateState(id, state, database = db) {
    const [record] = await database
      .update(ticketGithubIssues)
      .set({
        githubIssueState: state,
        updatedAt: new Date(),
      })
      .where(eq(ticketGithubIssues.id, id))
      .returning();

    return record || null;
  }
}


export default new TicketGithubIssueRepository();
