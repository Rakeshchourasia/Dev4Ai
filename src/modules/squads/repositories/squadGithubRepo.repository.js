import { eq, and, desc } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { squadGithubRepositories } from "../../../db/schema/squadGithubRepositories.schema.js";

class SquadGithubRepoRepository {
  /**
   * Find a link by squad ID and GitHub repository ID (unique pair).
   */
  async findBySquadAndRepoId(squadId, githubRepositoryId) {
    const [record] = await db
      .select()
      .from(squadGithubRepositories)
      .where(
        and(
          eq(squadGithubRepositories.squadId, squadId),
          eq(squadGithubRepositories.githubRepositoryId, String(githubRepositoryId))
        )
      )
      .limit(1);

    return record || null;
  }

  /**
   * Find a link by its primary key ID.
   */
  async findById(id) {
    const [record] = await db
      .select()
      .from(squadGithubRepositories)
      .where(eq(squadGithubRepositories.id, id))
      .limit(1);

    return record || null;
  }

  /**
   * List all linked repositories for a squad.
   */
  async findAllBySquadId(squadId) {
    return await db
      .select()
      .from(squadGithubRepositories)
      .where(eq(squadGithubRepositories.squadId, squadId))
      .orderBy(desc(squadGithubRepositories.createdAt));
  }

  /**
   * Insert a new squad <-> GitHub repository link.
   */
  async create(data) {
    const [record] = await db
      .insert(squadGithubRepositories)
      .values({
        squadId: data.squadId,
        githubRepositoryId: String(data.githubRepositoryId),
        githubRepositoryName: data.githubRepositoryName,
        githubOwner: data.githubOwner,
        githubFullName: data.githubFullName,
        githubUrl: data.githubUrl,
      })
      .returning();

    return record;
  }

  /**
   * Delete a link by ID.
   */
  async deleteById(id) {
    const [record] = await db
      .delete(squadGithubRepositories)
      .where(eq(squadGithubRepositories.id, id))
      .returning();

    return record || null;
  }
}

export default new SquadGithubRepoRepository();
