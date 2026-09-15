/**
 * githubOrg.service.js
 *
 * Business logic for GitHub Organization and Repository endpoints.
 *
 * SECURITY:
 *   - Always retrieves the GitHub token from the server-side encrypted store
 *     via githubConnectionService.getDecryptedAccessToken(userId).
 *   - Never accepts a token from the HTTP request layer.
 *   - Never returns raw GitHub API tokens or internal error details.
 *   - Never allows one DEVAI user to use another user's GitHub connection.
 */

import AppError from "../../../shared/errors/AppError.js";
import githubConnectionService from "./githubConnection.service.js";
import { githubGetAll, githubGet } from "../utils/githubClient.js";

class GithubOrgService {
  // ==========================================
  // LIST ORGANIZATIONS
  // GET /github/organizations
  // ==========================================

  /**
   * Returns all GitHub organizations accessible to the authenticated DEVAI user.
   *
   * @param {string} userId — DEVAI user UUID (from JWT — never from request input)
   * @returns {Promise<Array<{ id: number, login: string, avatarUrl: string, description: string|null }>>}
   */
  async listOrganizations(userId) {
    // 1. Retrieve this user's token from the encrypted store
    //    throws 404 AppError if the user has no GitHub connection
    const token = await githubConnectionService.getDecryptedAccessToken(userId);

    // 2. Fetch all organizations the authenticated user belongs to
    //    GitHub endpoint: GET /user/orgs
    const rawOrgs = await githubGetAll({
      path: "/user/orgs",
      token,
      context: "listing organizations",
    });

    // 3. Return only the safe, public fields — never return the token
    return rawOrgs.map((org) => ({
      id: org.id,
      login: org.login,
      avatarUrl: org.avatar_url,
      description: org.description || null,
    }));
  }

  // ==========================================
  // LIST ORGANIZATION REPOSITORIES
  // GET /github/organizations/:organization/repos
  // ==========================================

  /**
   * Returns repositories within a specific GitHub organization accessible to the user.
   *
   * @param {string} userId       — DEVAI user UUID (from JWT)
   * @param {string} organization — GitHub organization login (from URL param)
   * @param {object} options
   * @param {string} [options.type]    — "all" | "public" | "private" | "forks" | "sources" | "member" (default: "all")
   * @param {string} [options.sort]    — "created" | "updated" | "pushed" | "full_name" (default: "updated")
   * @param {string} [options.direction] — "asc" | "desc" (default: "desc")
   * @returns {Promise<Array>}
   */
  async listOrgRepos(userId, organization, { type = "all", sort = "updated", direction = "desc" } = {}) {
    if (!organization || typeof organization !== "string") {
      throw new AppError("Organization name is required", 400);
    }

    // Sanitize: org login must be alphanumeric + hyphens only
    const orgLogin = organization.trim();
    if (!/^[a-zA-Z0-9][a-zA-Z0-9\-]*$/.test(orgLogin)) {
      throw new AppError("Invalid organization name", 400);
    }

    // 1. Retrieve this user's token from the encrypted store
    const token = await githubConnectionService.getDecryptedAccessToken(userId);

    // 2. Fetch repositories for the org
    //    GitHub endpoint: GET /orgs/{org}/repos
    const rawRepos = await githubGetAll({
      path: `/orgs/${orgLogin}/repos`,
      token,
      context: `listing repositories for organization "${orgLogin}"`,
      query: { type, sort, direction },
    });

    // 3. Return a safe, normalized subset of repository fields
    return rawRepos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description || null,
      private: repo.private,
      fork: repo.fork,
      language: repo.language || null,
      defaultBranch: repo.default_branch,
      stargazersCount: repo.stargazers_count,
      forksCount: repo.forks_count,
      openIssuesCount: repo.open_issues_count,
      visibility: repo.visibility,
      htmlUrl: repo.html_url,
      pushedAt: repo.pushed_at,
      updatedAt: repo.updated_at,
      createdAt: repo.created_at,
    }));
  }
}

export default new GithubOrgService();
