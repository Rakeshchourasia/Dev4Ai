/**
 * githubRepo.service.js
 *
 * Business logic for GitHub Repository endpoints:
 *   - GET /github/repositories
 *   - GET /github/repositories/:owner/:repo
 *
 * SECURITY:
 *   - Uses githubConnectionService.getDecryptedAccessToken(userId)
 *   - Never accepts GitHub tokens from the client request
 *   - Never exposes tokens or raw internal GitHub payloads
 */

import AppError from "../../../shared/errors/AppError.js";
import githubTokenService from "./githubToken.service.js";
import { githubGet } from "../utils/githubClient.js";
import { getPagination, buildPagination } from "../../../shared/utils/pagination.js";
import { githubRepoParamSchema } from "../../../validation/github-repo.schema.js";

class GithubRepoService {
  // ==========================================
  // LIST REPOSITORIES
  // GET /github/repositories
  // ==========================================

  /**
   * Returns repositories accessible to the authenticated GitHub user.
   * Supports optional organization, visibility, page, and perPage filters.
   *
   * @param {string} userId - DEVAI user UUID (from JWT)
   * @param {object} query  - validated query object
   * @returns {Promise<{ repositories: Array, pagination: object }>}
   */
  async listRepositories(userId, query = {}) {
    // 1. Retrieve the user's valid GitHub access token
    const token = await githubTokenService.getValidAccessToken(userId);

    // 2. Extract pagination parameters
    const { page, limit } = getPagination(query);
    const perPage = query.perPage ? Math.min(Math.max(Number(query.perPage), 1), 100) : limit;

    const organization = query.organization ? String(query.organization).trim() : null;
    const visibility = query.visibility || "all";

    // 3. Determine endpoint path and query parameters
    let path;
    const ghQuery = {
      page,
      per_page: perPage,
    };

    if (organization) {
      path = `/orgs/${encodeURIComponent(organization)}/repos`;
      // GitHub /orgs/{org}/repos accepts type: "all" | "public" | "private" | "forks" | "sources" | "member"
      ghQuery.type = visibility;
    } else {
      path = "/user/repos";
      // GitHub /user/repos accepts visibility: "all" | "public" | "private"
      ghQuery.visibility = visibility;
      ghQuery.affiliation = "owner,collaborator,organization_member";
      ghQuery.sort = "updated";
      ghQuery.direction = "desc";
    }

    const context = organization
      ? `listing repositories for organization "${organization}"`
      : "listing user repositories";

    // 4. Request GitHub REST API via centralized client
    const rawRepos = await githubGet({
      path,
      token,
      query: ghQuery,
      context,
    });

    const reposArray = Array.isArray(rawRepos) ? rawRepos : [];

    // 5. Normalize repository data
    const repositories = reposArray.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner?.login || (typeof repo.owner === "string" ? repo.owner : null),
      private: repo.private,
      defaultBranch: repo.default_branch,
      htmlUrl: repo.html_url,
      description: repo.description || null,
      language: repo.language || null,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
      fork: repo.fork ?? false,
      visibility: repo.visibility || (repo.private ? "private" : "public"),
    }));

    // 6. Build pagination object
    let total;
    if (repositories.length < perPage) {
      total = (page - 1) * perPage + repositories.length;
    } else {
      total = page * perPage + 1; // indicates hasNextPage is true
    }

    const pagination = {
      ...buildPagination(page, perPage, total),
      perPage,
    };

    return {
      repositories,
      pagination,
    };
  }

  // ==========================================
  // GET REPOSITORY DETAILS
  // GET /github/repositories/:owner/:repo
  // ==========================================

  /**
   * Returns details for a single repository.
   *
   * @param {string} userId - DEVAI user UUID (from JWT)
   * @param {object} params - { owner, repo }
   * @returns {Promise<object>}
   */
  async getRepository(userId, params = {}) {
    // 1. Validate route params
    const parseResult = githubRepoParamSchema.safeParse(params);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((issue) => ({
        field: issue.path.join(".") || "params",
        message: issue.message,
      }));
      throw new AppError("Validation failed", 400, errors);
    }

    const { owner, repo } = parseResult.data;

    // 2. Retrieve user's valid GitHub access token
    const token = await githubTokenService.getValidAccessToken(userId);

    // 3. Request repository from GitHub API
    const rawRepo = await githubGet({
      path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      token,
      context: `fetching repository "${owner}/${repo}"`,
    });

    if (!rawRepo || typeof rawRepo !== "object") {
      throw new AppError("The requested GitHub resource was not found.", 404);
    }

    // 4. Return required repository fields
    return {
      id: rawRepo.id,
      name: rawRepo.name,
      fullName: rawRepo.full_name,
      owner: rawRepo.owner?.login || (typeof rawRepo.owner === "string" ? rawRepo.owner : null),
      private: rawRepo.private,
      defaultBranch: rawRepo.default_branch,
      htmlUrl: rawRepo.html_url,
      description: rawRepo.description || null,
      language: rawRepo.language || null,
      createdAt: rawRepo.created_at,
      updatedAt: rawRepo.updated_at,
    };
  }
}

export default new GithubRepoService();
