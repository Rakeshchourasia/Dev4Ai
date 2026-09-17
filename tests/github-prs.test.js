/**
 * github-prs.test.js
 *
 * Tests for STEP 6: GitHub Pull Requests + Commits + Diff Integration
 *   GET  /github/repos/:owner/:repo/pulls
 *   GET  /github/repos/:owner/:repo/pulls/:pullNumber
 *   GET  /github/repos/:owner/:repo/pulls/:pullNumber/files
 *   GET  /github/repos/:owner/:repo/pulls/:pullNumber/commits
 *   GET  /github/repos/:owner/:repo/pulls/:pullNumber/diff
 *   POST /tickets/:ticketId/github-prs/link
 *   GET  /tickets/:ticketId/github-prs
 *
 * Tests:
 *   - PR listing with query parameters and normalized fields
 *   - PR detailed view with normalized fields (baseBranch, headBranch, author, etc.)
 *   - PR changed files list with additions, deletions, patch
 *   - PR commits list
 *   - Normalized diff for AI code review module (pr, stats, files, rawDiff, commits)
 *   - Ticket PR linking:
 *     - Successful link and activity logging (GITHUB_PR_LINKED)
 *     - Duplicate link prevention (409)
 *     - Unlinked repository rejection (400)
 *     - Unauthorized squad member rejection (403)
 *   - Querying linked PRs for a ticket
 *   - Error handling: GitHub 404, 500 -> 502, timeout -> 504
 */

import dotenv from "dotenv";
dotenv.config();

process.env.NODE_ENV = "test";
process.env.GITHUB_CLIENT_ID = "test_github_client_id";
process.env.GITHUB_CLIENT_SECRET = "test_github_client_secret_xyz123";
process.env.GITHUB_CALLBACK_URL = "http://127.0.0.1:3000/auth/github/callback";
process.env.GITHUB_TOKEN_ENCRYPTION_KEY =
  "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20";

import assert from "node:assert/strict";
import http from "node:http";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import { pool, db } from "../src/db/index.js";
import { users } from "../src/db/schema/users.schema.js";
import { companies } from "../src/db/schema/companies.schema.js";
import { squads } from "../src/db/schema/squads.schema.js";
import { squadMembers } from "../src/db/schema/squadMembers.schema.js";
import { sprints } from "../src/db/schema/sprints.schema.js";
import { tickets } from "../src/db/schema/tickets.schema.js";
import { squadGithubRepositories } from "../src/db/schema/squadGithubRepositories.schema.js";
import { ticketGithubPullRequests } from "../src/db/schema/ticketGithubPullRequests.schema.js";
import { activityLogs } from "../src/db/schema/activityLogs.schema.js";
import { eq, and } from "drizzle-orm";
import config from "../src/config/index.js";

config.githubClientId = process.env.GITHUB_CLIENT_ID;
config.githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
config.githubCallbackUrl = process.env.GITHUB_CALLBACK_URL;
config.githubTokenEncryptionKey = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;

let server;
let baseUrl;
let passed = 0;
let failed = 0;
const failedTests = [];

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    failedTests.push({ name, error: err.message });
    failed++;
  }
}

// ==========================================
// MOCK GITHUB API
// ==========================================

const originalFetch = globalThis.fetch;

const dynamicRepoId = String(Date.now() + 654321);
const dynamicPrId = Date.now() + 5001;

const mockState = {
  oauthToken: "mock_gh_token_prs_suite",

  pullsListStatus: 200,
  pullsListBody: [
    {
      id: dynamicPrId,
      number: 101,
      title: "Add dark mode support",
      body: "Implements CSS variables for theming",
      state: "open",
      user: { login: "octocat" },
      html_url: "https://github.com/company/dev4ai/pull/101",
      base: { ref: "main" },
      head: { ref: "feature/dark-mode" },
      created_at: "2026-09-01T10:00:00Z",
      updated_at: "2026-09-02T12:00:00Z",
      merged_at: null,
    },
    {
      id: dynamicPrId + 1,
      number: 102,
      title: "Fix login button styling",
      body: "Addresses mobile alignment bug",
      state: "closed",
      user: { login: "contributor1" },
      html_url: "https://github.com/company/dev4ai/pull/102",
      base: { ref: "main" },
      head: { ref: "fix/login-btn" },
      created_at: "2026-08-25T14:00:00Z",
      updated_at: "2026-08-26T09:00:00Z",
      merged_at: "2026-08-26T09:00:00Z",
    },
  ],

  singlePullStatus: 200,
  singlePullBody: {
    id: dynamicPrId,
    number: 101,
    title: "Add dark mode support",
    body: "Implements CSS variables for theming",
    state: "open",
    user: { login: "octocat" },
    html_url: "https://github.com/company/dev4ai/pull/101",
    base: { ref: "main" },
    head: { ref: "feature/dark-mode" },
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-02T12:00:00Z",
    merged_at: null,
    additions: 150,
    deletions: 30,
    changed_files: 2,
    commits: 2,
  },

  pullFilesStatus: 200,
  pullFilesBody: [
    {
      sha: "f111",
      filename: "src/theme.css",
      status: "added",
      additions: 100,
      deletions: 0,
      changes: 100,
      patch: "@@ -0,0 +1,100 @@\n+:root { --bg: #000; }",
      raw_url: "https://github.com/company/dev4ai/raw/f111/src/theme.css",
    },
    {
      sha: "f222",
      filename: "src/app.js",
      status: "modified",
      additions: 50,
      deletions: 30,
      changes: 80,
      patch: "@@ -10,3 +10,5 @@\n+import theme from './theme';",
      raw_url: "https://github.com/company/dev4ai/raw/f222/src/app.js",
    },
  ],

  pullCommitsStatus: 200,
  pullCommitsBody: [
    {
      sha: "c111",
      commit: {
        author: { name: "Octo Cat", date: "2026-09-01T10:00:00Z" },
        message: "feat: add theme tokens",
      },
      html_url: "https://github.com/company/dev4ai/commit/c111",
    },
    {
      sha: "c222",
      commit: {
        author: { name: "Octo Cat", date: "2026-09-02T12:00:00Z" },
        message: "fix: apply theme switch in App",
      },
      html_url: "https://github.com/company/dev4ai/commit/c222",
    },
  ],

  rawDiffStatus: 200,
  rawDiffBody: "diff --git a/src/theme.css b/src/theme.css\nnew file mode 100644\n--- /dev/null\n+++ b/src/theme.css\n@@ -0,0 +1,100 @@\n+:root { --bg: #000; }\n",

  simulateTimeout: false,
};

let baseGithubUserId = Date.now() + 80000;

globalThis.fetch = async (url, options = {}) => {
  const urlStr = String(url);

  // OAuth endpoints
  if (urlStr.includes("github.com/login/oauth/access_token")) {
    return new Response(
      JSON.stringify({
        access_token: mockState.oauthToken,
        scope: "read:user user:email repo",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  if (urlStr.endsWith("api.github.com/user")) {
    const user = {
      id: baseGithubUserId,
      login: `pr_user_${baseGithubUserId}`,
      name: "PR Test User",
      avatar_url: `https://avatars.githubusercontent.com/u/${baseGithubUserId}`,
    };
    return new Response(JSON.stringify(user), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (urlStr.includes("api.github.com/user/emails")) {
    const emails = [
      {
        email: `pr_${baseGithubUserId}@example.com`,
        primary: true,
        verified: true,
      },
    ];
    return new Response(JSON.stringify(emails), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Timeout simulation
  if (mockState.simulateTimeout) {
    const err = new Error("The operation was aborted");
    err.name = "AbortError";
    throw err;
  }

  // PR Files: /repos/:owner/:repo/pulls/:number/files
  if (urlStr.match(/api\.github\.com\/repos\/[^/]+\/[^/]+\/pulls\/\d+\/files/)) {
    return new Response(JSON.stringify(mockState.pullFilesBody), {
      status: mockState.pullFilesStatus,
      headers: { "Content-Type": "application/json" },
    });
  }

  // PR Commits: /repos/:owner/:repo/pulls/:number/commits
  if (urlStr.match(/api\.github\.com\/repos\/[^/]+\/[^/]+\/pulls\/\d+\/commits/)) {
    return new Response(JSON.stringify(mockState.pullCommitsBody), {
      status: mockState.pullCommitsStatus,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Single PR with Accept: diff
  const singlePrMatch = urlStr.match(/api\.github\.com\/repos\/[^/]+\/[^/]+\/pulls\/(\d+)/);
  if (singlePrMatch) {
    const acceptHeader = options.headers?.Accept || options.headers?.accept || "";
    if (acceptHeader.includes("vnd.github.v3.diff")) {
      return new Response(mockState.rawDiffBody, {
        status: mockState.rawDiffStatus,
        headers: { "Content-Type": "text/plain" },
      });
    }

    return new Response(JSON.stringify(mockState.singlePullBody), {
      status: mockState.singlePullStatus,
      headers: { "Content-Type": "application/json" },
    });
  }

  // GET pulls list: /repos/:owner/:repo/pulls
  if (urlStr.includes("api.github.com/repos/") && urlStr.includes("/pulls")) {
    return new Response(JSON.stringify(mockState.pullsListBody), {
      status: mockState.pullsListStatus,
      headers: { "Content-Type": "application/json" },
    });
  }

  return originalFetch(url, options);
};

// ==========================================
// HTTP REQUEST HELPER
// ==========================================

async function request(path, options = {}) {
  const res = await originalFetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    redirect: options.redirect || "manual",
  });

  let data = null;
  const ct = res.headers.get("content-type") || "";
  data = ct.includes("application/json") ? await res.json() : await res.text();

  return { status: res.status, headers: res.headers, body: data };
}

/** Full GitHub OAuth callback — returns DEVAI accessToken & user */
async function performOAuth() {
  const initRes = await request("/auth/github", { headers: { Accept: "application/json" } });
  assert.equal(initRes.status, 200, "OAuth init must return 200");
  const { state } = initRes.body.data;
  const { nonce } = jwt.verify(state, config.jwtSecret);

  const callbackRes = await request(
    `/auth/github/callback?code=mock_code_${Date.now()}&state=${state}`,
    {
      headers: {
        Accept: "application/json",
        Cookie: `devai_oauth_nonce=${nonce}`,
      },
    }
  );
  assert.equal(callbackRes.status, 200, "OAuth callback must return 200");
  return callbackRes.body.data;
}

// ==========================================
// TEST SUITE
// ==========================================

async function runPrTests() {
  console.log("\n========================================================");
  console.log("🚀 STARTING STEP 6: GITHUB PULL REQUESTS TEST SUITE");
  console.log("========================================================\n");

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  let squadId;
  let sprintId;
  let ticketId;
  let memberToken;
  let memberUserId;
  let nonMemberToken;
  let nonMemberUserId;

  try {
    // Setup test database fixtures
    const [company] = await db
      .insert(companies)
      .values({ name: `PR Test Company ${Date.now()}` })
      .returning();

    const [squad] = await db
      .insert(squads)
      .values({ companyId: company.id, name: `PR Squad ${Date.now()}` })
      .returning();
    squadId = squad.id;

    // Link repository to squad
    await db.insert(squadGithubRepositories).values({
      squadId,
      githubRepositoryId: dynamicRepoId,
      githubRepositoryName: "dev4ai",
      githubOwner: "company",
      githubFullName: "company/dev4ai",
      githubUrl: "https://github.com/company/dev4ai",
    });

    // Create member user with GitHub connection
    baseGithubUserId += 1;
    const memberOAuth = await performOAuth();
    memberToken = memberOAuth.accessToken;
    memberUserId = memberOAuth.user.id;

    await db.insert(squadMembers).values({
      squadId,
      userId: memberUserId,
      role: "DEVELOPER",
    });

    // Create non-member user
    baseGithubUserId += 1;
    const nonMemberOAuth = await performOAuth();
    nonMemberToken = nonMemberOAuth.accessToken;
    nonMemberUserId = nonMemberOAuth.user.id;

    // Create sprint and ticket
    const [sprint] = await db
      .insert(sprints)
      .values({
        squadId,
        name: "Sprint PR",
        status: "ACTIVE",
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 86400000),
      })
      .returning();
    sprintId = sprint.id;

    const [ticket] = await db
      .insert(tickets)
      .values({
        squadId,
        sprintId,
        title: "Implement Dark Mode UI",
        description: "Add user toggle and theme persistence",
        status: "IN_PROGRESS",
        priority: "HIGH",
        createdBy: memberUserId,
      })
      .returning();
    ticketId = ticket.id;

    console.log(`  ✓ Fixtures setup complete: Squad ${squadId}, Ticket ${ticketId}\n`);

    // ------------------------------------------------------------------
    // 1. PR Listing: GET /github/repos/:owner/:repo/pulls
    // ------------------------------------------------------------------
    console.log("--- 1. GitHub Pull Requests Listing ---");

    await test("GET /github/repos/:owner/:repo/pulls returns normalized pull requests", async () => {
      const res = await request("/github/repos/company/dev4ai/pulls", {
        headers: { Authorization: `Bearer ${memberToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.data.length, 2);

      const first = res.body.data[0];
      assert.equal(first.id, dynamicPrId);
      assert.equal(first.number, 101);
      assert.equal(first.title, "Add dark mode support");
      assert.equal(first.state, "open");
      assert.equal(first.author, "octocat");
      assert.equal(first.baseBranch, "main");
      assert.equal(first.headBranch, "feature/dark-mode");
    });

    await test("GET /github/repos/:owner/:repo/pulls without auth token returns 401", async () => {
      const res = await request("/github/repos/company/dev4ai/pulls");
      assert.equal(res.status, 401);
    });

    // ------------------------------------------------------------------
    // 2. PR Details: GET /github/repos/:owner/:repo/pulls/:pullNumber
    // ------------------------------------------------------------------
    console.log("\n--- 2. Single Pull Request Details ---");

    await test("GET /github/repos/:owner/:repo/pulls/:pullNumber returns normalized PR details", async () => {
      const res = await request("/github/repos/company/dev4ai/pulls/101", {
        headers: { Authorization: `Bearer ${memberToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      const pr = res.body.data;
      assert.equal(pr.id, dynamicPrId);
      assert.equal(pr.number, 101);
      assert.equal(pr.title, "Add dark mode support");
      assert.equal(pr.body, "Implements CSS variables for theming");
      assert.equal(pr.state, "open");
      assert.equal(pr.author, "octocat");
      assert.equal(pr.url, "https://github.com/company/dev4ai/pull/101");
      assert.equal(pr.baseBranch, "main");
      assert.equal(pr.headBranch, "feature/dark-mode");
      assert.equal(pr.createdAt, "2026-09-01T10:00:00Z");
      assert.equal(pr.updatedAt, "2026-09-02T12:00:00Z");
      assert.equal(pr.mergedAt, null);
    });

    // ------------------------------------------------------------------
    // 3. PR Files: GET /github/repos/:owner/:repo/pulls/:pullNumber/files
    // ------------------------------------------------------------------
    console.log("\n--- 3. Pull Request Changed Files ---");

    await test("GET /github/repos/:owner/:repo/pulls/:pullNumber/files returns changed files with patches", async () => {
      const res = await request("/github/repos/company/dev4ai/pulls/101/files", {
        headers: { Authorization: `Bearer ${memberToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.data.length, 2);

      const file = res.body.data[0];
      assert.equal(file.filename, "src/theme.css");
      assert.equal(file.status, "added");
      assert.equal(file.additions, 100);
      assert.equal(file.deletions, 0);
      assert.ok(file.patch.includes(":root"));
    });

    // ------------------------------------------------------------------
    // 4. PR Commits: GET /github/repos/:owner/:repo/pulls/:pullNumber/commits
    // ------------------------------------------------------------------
    console.log("\n--- 4. Pull Request Commits ---");

    await test("GET /github/repos/:owner/:repo/pulls/:pullNumber/commits returns commit history", async () => {
      const res = await request("/github/repos/company/dev4ai/pulls/101/commits", {
        headers: { Authorization: `Bearer ${memberToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.data.length, 2);

      const c = res.body.data[0];
      assert.equal(c.sha, "c111");
      assert.equal(c.author, "Octo Cat");
      assert.equal(c.message, "feat: add theme tokens");
    });

    // ------------------------------------------------------------------
    // 5. PR Diff for AI Review: GET /github/repos/:owner/:repo/pulls/:pullNumber/diff
    // ------------------------------------------------------------------
    console.log("\n--- 5. Normalized Diff & Changes for AI Review ---");

    await test("GET /github/repos/:owner/:repo/pulls/:pullNumber/diff returns unified structure for AI review", async () => {
      const res = await request("/github/repos/company/dev4ai/pulls/101/diff", {
        headers: { Authorization: `Bearer ${memberToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      const diff = res.body.data;
      assert.ok(diff.pr);
      assert.equal(diff.pr.id, dynamicPrId);
      assert.equal(diff.pr.number, 101);

      assert.ok(diff.stats);
      assert.equal(diff.stats.additions, 150);
      assert.equal(diff.stats.deletions, 30);
      assert.equal(diff.stats.changedFiles, 2);
      assert.equal(diff.stats.commitsCount, 2);

      assert.ok(Array.isArray(diff.files));
      assert.equal(diff.files.length, 2);

      assert.ok(diff.rawDiff);
      assert.ok(diff.rawDiff.includes("diff --git a/src/theme.css"));

      assert.ok(Array.isArray(diff.commits));
      assert.equal(diff.commits.length, 2);
    });

    // ------------------------------------------------------------------
    // 6. Ticket PR Linking: POST & GET /tickets/:ticketId/github-prs
    // ------------------------------------------------------------------
    console.log("\n--- 6. Ticket <-> GitHub PR Linking ---");

    await test("POST /tickets/:ticketId/github-prs/link links PR to ticket and creates activity log", async () => {
      const res = await request(`/tickets/${ticketId}/github-prs/link`, {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({
          pullNumber: 101,
          owner: "company",
          repo: "dev4ai",
        }),
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.githubPr);

      const ghPr = res.body.data.githubPr;
      assert.equal(ghPr.ticketId, ticketId);
      assert.equal(ghPr.githubRepositoryId, dynamicRepoId);
      assert.equal(ghPr.githubPrId, String(dynamicPrId));
      assert.equal(ghPr.githubPrNumber, 101);
      assert.equal(ghPr.state, "open");

      // Verify activity log
      const [activity] = await db
        .select()
        .from(activityLogs)
        .where(
          and(
            eq(activityLogs.ticketId, ticketId),
            eq(activityLogs.action, "GITHUB_PR_LINKED")
          )
        );
      assert.ok(activity, "Activity log for PR linking must exist");
      assert.equal(activity.userId, memberUserId);
    });

    await test("POST duplicate link returns 409 Conflict", async () => {
      const res = await request(`/tickets/${ticketId}/github-prs/link`, {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({
          pullNumber: 101,
          owner: "company",
          repo: "dev4ai",
        }),
      });

      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
    });

    await test("POST link with unlinked repository returns 400 Bad Request", async () => {
      const res = await request(`/tickets/${ticketId}/github-prs/link`, {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({
          pullNumber: 101,
          owner: "unlinked-org",
          repo: "unlinked-repo",
        }),
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    await test("POST link by unauthorized user returns 403 Forbidden", async () => {
      const res = await request(`/tickets/${ticketId}/github-prs/link`, {
        method: "POST",
        headers: { Authorization: `Bearer ${nonMemberToken}` },
        body: JSON.stringify({
          pullNumber: 101,
          owner: "company",
          repo: "dev4ai",
        }),
      });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    await test("GET /tickets/:ticketId/github-prs returns array of linked PRs", async () => {
      const res = await request(`/tickets/${ticketId}/github-prs`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.data.length, 1);

      const pr = res.body.data[0];
      assert.equal(pr.githubPrNumber, 101);
      assert.equal(pr.ticketId, ticketId);
    });

    // ------------------------------------------------------------------
    // 7. Error Handling: GitHub 404, 500, Timeout
    // ------------------------------------------------------------------
    console.log("\n--- 7. GitHub API Error Handling ---");

    await test("GitHub 404 when PR not found returns 404", async () => {
      mockState.singlePullStatus = 404;
      const res = await request("/github/repos/company/dev4ai/pulls/99999", {
        headers: { Authorization: `Bearer ${memberToken}` },
      });

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      mockState.singlePullStatus = 200;
    });

    await test("GitHub 500 when fetching files returns 502 Bad Gateway", async () => {
      mockState.pullFilesStatus = 500;
      const res = await request("/github/repos/company/dev4ai/pulls/101/files", {
        headers: { Authorization: `Bearer ${memberToken}` },
      });

      assert.equal(res.status, 502);
      assert.equal(res.body.success, false);
      mockState.pullFilesStatus = 200;
    });

    await test("GitHub API timeout returns 504 Gateway Timeout", async () => {
      mockState.simulateTimeout = true;
      const res = await request("/github/repos/company/dev4ai/pulls", {
        headers: { Authorization: `Bearer ${memberToken}` },
      });

      assert.equal(res.status, 504);
      assert.equal(res.body.success, false);
      mockState.simulateTimeout = false;
    });

  } finally {
    globalThis.fetch = originalFetch;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
  }

  console.log("\n========================================================");
  console.log(`📊 GITHUB PRS TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("========================================================\n");

  if (failedTests.length > 0) {
    console.log("Failed tests summary:");
    failedTests.forEach((f) => console.log(`  - ${f.name}: ${f.error}`));
    console.log("");
  }

  process.exit(failed > 0 ? 1 : 0);
}

runPrTests().catch((err) => {
  console.error("Test runner fatal error:", err);
  process.exit(1);
});
