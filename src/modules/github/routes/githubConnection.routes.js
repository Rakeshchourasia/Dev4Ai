import { Router } from "express";
import authenticate from "../../../shared/middlewares/auth.middleware.js";
import { validate } from "../../../shared/middlewares/validate.js";
import { validateQuery } from "../../../shared/middlewares/validateQuery.js";
import { validateParams } from "../../../shared/middlewares/validateParams.js";
import {
  githubRepoListQuerySchema,
  githubRepoParamSchema,
} from "../../../validation/github-repo.schema.js";
import {
  repoPathParamsSchema,
  listGithubIssuesQuerySchema,
  importGithubIssueSchema,
  ticketIdParamSchema,
  createIssueFromTicketSchema,
} from "../../../validation/github-issue.schema.js";
import {
  listGithubPullsQuerySchema,
  pullNumberParamSchema,
} from "../../../validation/github-pr.schema.js";
import githubConnectionController from "../controllers/githubConnection.controller.js";
import githubOrgController from "../controllers/githubOrg.controller.js";
import githubRepoController from "../controllers/githubRepo.controller.js";
import githubIssueController from "../controllers/githubIssue.controller.js";
import githubPrController from "../controllers/githubPr.controller.js";
import githubWebhookController from "../controllers/githubWebhook.controller.js";

import { verifyGithubWebhook } from "../../../shared/middlewares/verifyGithubWebhook.js";

const router = Router();


/**
 * GET /github/connection
 *
 * Returns safe GitHub connection info for the authenticated user.
 * Never exposes tokens.
 */
router.get(
  "/connection",
  authenticate,
  githubConnectionController.getConnection
);

/**
 * DELETE /github/connection
 *
 * Revokes and removes the GitHub connection for the authenticated user.
 * Does NOT delete the DEVAI account or user_auth_accounts record.
 */
router.delete(
  "/connection",
  authenticate,
  githubConnectionController.deleteConnection
);

/**
 * GET /github/organizations
 *
 * Returns all GitHub organizations accessible to the authenticated user's
 * connected GitHub account. Token is always server-side — never from request.
 */
router.get(
  "/organizations",
  authenticate,
  githubOrgController.listOrganizations
);

/**
 * GET /github/organizations/:organization/repos
 *
 * Returns repositories within the specified GitHub organization accessible
 * to the authenticated user's connected GitHub account.
 *
 * Query params (all optional):
 *   type       — all | public | private | forks | sources | member  (default: all)
 *   sort       — created | updated | pushed | full_name              (default: updated)
 *   direction  — asc | desc                                          (default: desc)
 */
router.get(
  "/organizations/:organization/repos",
  authenticate,
  githubOrgController.listOrgRepos
);

/**
 * GET /github/repositories
 *
 * Returns repositories accessible to the authenticated GitHub user.
 *
 * Query params (all optional):
 *   organization — organization login name
 *   visibility   — all | public | private (default: all)
 *   page         — page number (default: 1)
 *   perPage      — results per page (default: 30, max: 100)
 */
router.get(
  "/repositories",
  authenticate,
  validateQuery(githubRepoListQuerySchema),
  githubRepoController.listRepositories
);

/**
 * GET /github/repositories/:owner/:repo
 *
 * Returns details for a specific repository.
 */
router.get(
  "/repositories/:owner/:repo",
  authenticate,
  validateParams(githubRepoParamSchema),
  githubRepoController.getRepository
);

// ==========================================
// GITHUB ISSUES INTEGRATION
// ==========================================

/**
 * GET /github/repos/:owner/:repo/issues
 *
 * Lists issues from a GitHub repository.
 */
router.get(
  "/repos/:owner/:repo/issues",
  authenticate,
  validateParams(repoPathParamsSchema),
  validateQuery(listGithubIssuesQuerySchema),
  githubIssueController.listIssues
);

/**
 * POST /github/repos/:owner/:repo/issues/import
 *
 * Imports a GitHub issue into a DEVAI ticket.
 */
router.post(
  "/repos/:owner/:repo/issues/import",
  authenticate,
  validateParams(repoPathParamsSchema),
  validate(importGithubIssueSchema),
  githubIssueController.importIssue
);

/**
 * POST /github/tickets/:ticketId/issue
 *
 * Creates a GitHub issue from a DEVAI ticket and links them.
 */
router.post(
  "/tickets/:ticketId/issue",
  authenticate,
  validateParams(ticketIdParamSchema),
  validate(createIssueFromTicketSchema),
  githubIssueController.createIssueFromTicket
);

// ==========================================
// GITHUB PULL REQUESTS INTEGRATION
// ==========================================

/**
 * GET /github/repos/:owner/:repo/pulls
 *
 * Lists pull requests from a GitHub repository.
 */
router.get(
  "/repos/:owner/:repo/pulls",
  authenticate,
  validateParams(repoPathParamsSchema),
  validateQuery(listGithubPullsQuerySchema),
  githubPrController.listPulls
);

/**
 * GET /github/repos/:owner/:repo/pulls/:pullNumber
 *
 * Gets detailed info for a single pull request.
 */
router.get(
  "/repos/:owner/:repo/pulls/:pullNumber",
  authenticate,
  validateParams(pullNumberParamSchema),
  githubPrController.getPull
);

/**
 * GET /github/repos/:owner/:repo/pulls/:pullNumber/files
 *
 * Gets changed files in a pull request.
 */
router.get(
  "/repos/:owner/:repo/pulls/:pullNumber/files",
  authenticate,
  validateParams(pullNumberParamSchema),
  githubPrController.getPullFiles
);

/**
 * GET /github/repos/:owner/:repo/pulls/:pullNumber/commits
 *
 * Gets commits in a pull request.
 */
router.get(
  "/repos/:owner/:repo/pulls/:pullNumber/commits",
  authenticate,
  validateParams(pullNumberParamSchema),
  githubPrController.getPullCommits
);

/**
 * GET /github/repos/:owner/:repo/pulls/:pullNumber/diff
 *
 * Gets normalized diff and changes for a pull request (ready for AI review).
 */
router.get(
  "/repos/:owner/:repo/pulls/:pullNumber/diff",
  authenticate,
  validateParams(pullNumberParamSchema),
  githubPrController.getPullDiff
);

// ==========================================
// GITHUB WEBHOOKS
// ==========================================

/**
 * POST /github/webhooks
 *
 * Public GitHub webhook endpoint.
 * Protected by timing-safe HMAC-SHA256 signature verification (X-Hub-Signature-256).
 * Does NOT require DEVAI JWT authentication.
 */
router.post(
  "/webhooks",
  verifyGithubWebhook,
  githubWebhookController.handleWebhook
);

export default router;


