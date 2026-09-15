/**
 * github-issues.test.js
 *
 * Tests for STEP 5: GitHub Issues <-> DEVAI Tickets Integration
 *   GET    /github/repos/:owner/:repo/issues
 *   POST   /github/repos/:owner/:repo/issues/import
 *   POST   /github/tickets/:ticketId/issue
 *   GET    /tickets/:ticketId/github-issue
 *   DELETE /tickets/:ticketId/github-issue
 *
 * Tests:
 *   - issue listing (filters out PRs)
 *   - issue import (explicit title, body, status mapping, createdBy security)
 *   - ticket -> GitHub issue export
 *   - duplicate mapping prevention (409)
 *   - unauthorized ticket / squad access (403)
 *   - unlinked repository rejection (400)
 *   - GitHub API failure mapping (404, 500, timeout)
 *   - activity logging verification
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
import app from "../src/app.js";
import { pool, db } from "../src/db/index.js";
import { users } from "../src/db/schema/users.schema.js";
import { companies } from "../src/db/schema/companies.schema.js";
import { squads } from "../src/db/schema/squads.schema.js";
import { squadMembers } from "../src/db/schema/squadMembers.schema.js";
import { sprints } from "../src/db/schema/sprints.schema.js";
import { tickets } from "../src/db/schema/tickets.schema.js";
import { squadGithubRepositories } from "../src/db/schema/squadGithubRepositories.schema.js";
import { ticketGithubIssues } from "../src/db/schema/ticketGithubIssues.schema.js";
import { activityLogs } from "../src/db/schema/activityLogs.schema.js";
import { eq, and } from "drizzle-orm";
import jwt from "jsonwebtoken";
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

const dynamicRepoId = String(Date.now() + 123456);
const dynamicSingleIssueId = Date.now() + 88801;
const dynamicCreatedIssueId = Date.now() + 88802;

const mockState = {
  oauthToken: "mock_gh_token_issues_suite",

  // Issue list mock
  issuesListStatus: 200,
  issuesListBody: [
    {
      id: 77701,
      number: 101,
      title: "Crash on mobile view",
      body: "App white-screens on iOS Safari",
      state: "open",
      html_url: "https://github.com/company/dev4ai/issues/101",
      user: { login: "reporter1" },
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-02T00:00:00Z",
    },
    {
      id: 77702,
      number: 102,
      title: "Closed feature request",
      body: "Already done in v1.0",
      state: "closed",
      html_url: "https://github.com/company/dev4ai/issues/102",
      user: { login: "reporter2" },
      created_at: "2026-08-15T00:00:00Z",
      updated_at: "2026-08-20T00:00:00Z",
    },
    {
      // Pull request item that GitHub API returns in issues endpoint
      id: 77703,
      number: 103,
      title: "Pull request to be filtered",
      body: "PR description",
      state: "open",
      html_url: "https://github.com/company/dev4ai/pull/103",
      pull_request: { url: "https://api.github.com/repos/company/dev4ai/pulls/103" },
      user: { login: "dev1" },
    },
  ],

  // Single issue mock
  singleIssueStatus: 200,
  singleIssueBody: {
    id: dynamicSingleIssueId,
    number: 42,
    title: "Critical memory leak in cache",
    body: "Redis connection pool does not close idle sockets properly",
    state: "open",
    html_url: "https://github.com/company/dev4ai/issues/42",
  },

  // Created issue mock
  createIssueStatus: 201,
  createIssueBody: {
    id: dynamicCreatedIssueId,
    number: 99,
    title: "Ticket Title Exported",
    body: "Ticket Description Exported",
    state: "open",
    html_url: "https://github.com/company/dev4ai/issues/99",
  },

  simulateTimeout: false,
};

let baseGithubUserId = Date.now() + 90000;

globalThis.fetch = async (url, options = {}) => {
  const urlStr = String(url);

  // OAuth flows
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
      login: `issue_user_${baseGithubUserId}`,
      name: "Issue Test User",
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
        email: `issue_${baseGithubUserId}@example.com`,
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

  // Single issue: /repos/:owner/:repo/issues/:issueNumber
  const singleIssueMatch = urlStr.match(/api\.github\.com\/repos\/[^/]+\/[^/]+\/issues\/(\d+)/);
  if (singleIssueMatch && options.method !== "POST") {
    return new Response(JSON.stringify(mockState.singleIssueBody), {
      status: mockState.singleIssueStatus,
      headers: { "Content-Type": "application/json" },
    });
  }

  // POST create issue: /repos/:owner/:repo/issues
  if (urlStr.includes("api.github.com/repos/") && urlStr.endsWith("/issues") && options.method === "POST") {
    return new Response(JSON.stringify(mockState.createIssueBody), {
      status: mockState.createIssueStatus,
      headers: { "Content-Type": "application/json" },
    });
  }

  // GET issues list: /repos/:owner/:repo/issues
  if (urlStr.includes("api.github.com/repos/") && urlStr.includes("/issues")) {
    return new Response(JSON.stringify(mockState.issuesListBody), {
      status: mockState.issuesListStatus,
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
  const { state } = initRes.body.data;
  const { nonce } = jwt.verify(state, config.jwtSecret);

  const cbRes = await request(
    `/auth/github/callback?code=issue_code_${Date.now()}&state=${state}`,
    { headers: { Cookie: `devai_oauth_nonce=${nonce}` } }
  );
  return cbRes.body.data;
}

// ==========================================
// TEST SUITE
// ==========================================

async function runIssueTests() {
  console.log("\n========================================================");
  console.log("🧪 DEVAI GITHUB ISSUES ↔ TICKETS TEST SUITE (STEP 5)");
  console.log("========================================================\n");

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  let memberToken;
  let memberUserId;
  let nonMemberToken;
  let nonMemberUserId;
  let squadId;
  let sprintId;
  let ticketId;

  try {
    // ------------------------------------------------------------------
    // Setup: Seed Company, Squad, Sprint, Ticket, Linked Repo & Users
    // ------------------------------------------------------------------
    console.log("--- Setup: Seeding test environment ---");

    const [company] = await db
      .insert(companies)
      .values({ name: `Issues Test Company ${Date.now()}` })
      .returning();

    const [squad] = await db
      .insert(squads)
      .values({ companyId: company.id, name: `DevOps Squad ${Date.now()}` })
      .returning();
    squadId = squad.id;

    // Link repository "company/dev4ai" to squad
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

    // Create sprint
    const [sprint] = await db
      .insert(sprints)
      .values({
        squadId,
        name: "Sprint 1",
        status: "ACTIVE",
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 86400000),
      })
      .returning();
    sprintId = sprint.id;

    // Create initial ticket for export test
    const [initialTicket] = await db
      .insert(tickets)
      .values({
        squadId,
        sprintId,
        title: "Database index optimization",
        description: "Add compound index on activity logs",
        status: "TODO",
        priority: "HIGH",
        createdBy: memberUserId,
      })
      .returning();
    ticketId = initialTicket.id;

    console.log(`  ✓ Squad: ${squadId}`);
    console.log(`  ✓ Member user: ${memberUserId}`);
    console.log(`  ✓ Initial Ticket: ${ticketId}\n`);

    // ------------------------------------------------------------------
    // 1. Issue Listing: GET /github/repos/:owner/:repo/issues
    // ------------------------------------------------------------------
    console.log("--- 1. GitHub Issue Listing ---");

    await test("GET /github/repos/:owner/:repo/issues returns issues excluding pull requests", async () => {
      const res = await request("/github/repos/company/dev4ai/issues", {
        headers: { Authorization: `Bearer ${memberToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      // Should filter out the PR item, so only 2 items returned
      assert.equal(res.body.data.length, 2);

      const first = res.body.data[0];
      assert.equal(first.id, 77701);
      assert.equal(first.number, 101);
      assert.equal(first.title, "Crash on mobile view");
      assert.equal(first.state, "open");
      assert.equal(first.user, "reporter1");
    });

    await test("GET /github/repos/:owner/:repo/issues without token returns 401", async () => {
      const res = await request("/github/repos/company/dev4ai/issues");
      assert.equal(res.status, 401);
    });

    // ------------------------------------------------------------------
    // 2. Issue Import: POST /github/repos/:owner/:repo/issues/import
    // ------------------------------------------------------------------
    console.log("\n--- 2. GitHub Issue Import into DEVAI Ticket ---");

    let importedTicketId;

    await test("Successfully imports GitHub issue into DEVAI ticket with explicit mapping", async () => {
      const res = await request("/github/repos/company/dev4ai/issues/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({
          issueNumber: 42,
          squadId,
          sprintId,
          priority: "HIGH",
        }),
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.ticket);
      assert.ok(res.body.data.githubIssue);

      const t = res.body.data.ticket;
      assert.equal(t.squadId, squadId);
      assert.equal(t.sprintId, sprintId);
      assert.equal(t.title, "Critical memory leak in cache");
      assert.equal(t.description, "Redis connection pool does not close idle sockets properly");
      assert.equal(t.status, "TODO"); // open -> TODO
      assert.equal(t.priority, "HIGH");
      assert.equal(t.createdBy, memberUserId); // Server-side user identity

      const gh = res.body.data.githubIssue;
      assert.equal(gh.githubRepositoryId, dynamicRepoId);
      assert.equal(gh.githubIssueId, String(dynamicSingleIssueId));
      assert.equal(gh.githubIssueNumber, 42);
      assert.equal(gh.githubIssueState, "open");

      importedTicketId = t.id;

      // Verify activity log was created
      const [activity] = await db
        .select()
        .from(activityLogs)
        .where(
          and(
            eq(activityLogs.ticketId, importedTicketId),
            eq(activityLogs.action, "TICKET_IMPORTED_FROM_GITHUB")
          )
        );
      assert.ok(activity, "Activity log for import must exist");
      assert.equal(activity.userId, memberUserId);
    });

    await test("Attempting to import with an unlinked repository returns 400", async () => {
      const res = await request("/github/repos/other-org/unlinked-repo/issues/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({
          issueNumber: 42,
          squadId,
          sprintId,
        }),
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("not linked to this squad"));
    });

    await test("Duplicate issue import returns 409 Conflict", async () => {
      const res = await request("/github/repos/company/dev4ai/issues/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({
          issueNumber: 42,
          squadId,
          sprintId,
        }),
      });

      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("already linked"));
    });

    await test("Unauthorized squad access returns 403 on import", async () => {
      const res = await request("/github/repos/company/dev4ai/issues/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${nonMemberToken}` },
        body: JSON.stringify({
          issueNumber: 42,
          squadId,
          sprintId,
        }),
      });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    // ------------------------------------------------------------------
    // 3. Ticket -> GitHub Issue: POST /github/tickets/:ticketId/issue
    // ------------------------------------------------------------------
    console.log("\n--- 3. DEVAI Ticket -> GitHub Issue Export ---");

    await test("Successfully exports DEVAI ticket to GitHub issue and stores mapping", async () => {
      const res = await request(`/github/tickets/${ticketId}/issue`, {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({
          owner: "company",
          repo: "dev4ai",
        }),
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.githubIssue);

      const gh = res.body.data.githubIssue;
      assert.equal(gh.ticketId, ticketId);
      assert.equal(gh.githubRepositoryId, dynamicRepoId);
      assert.equal(gh.githubIssueId, String(dynamicCreatedIssueId));
      assert.equal(gh.githubIssueNumber, 99);
      assert.equal(gh.githubIssueUrl, "https://github.com/company/dev4ai/issues/99");

      // Verify activity log
      const [activity] = await db
        .select()
        .from(activityLogs)
        .where(
          and(
            eq(activityLogs.ticketId, ticketId),
            eq(activityLogs.action, "GITHUB_ISSUE_CREATED")
          )
        );
      assert.ok(activity, "Activity log for issue creation must exist");
      assert.equal(activity.userId, memberUserId);
    });

    await test("Duplicate mapping: re-exporting an already linked ticket returns 409", async () => {
      const res = await request(`/github/tickets/${ticketId}/issue`, {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({
          owner: "company",
          repo: "dev4ai",
        }),
      });

      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("already linked"));
    });

    await test("Unauthorized user exporting ticket returns 403", async () => {
      const res = await request(`/github/tickets/${ticketId}/issue`, {
        method: "POST",
        headers: { Authorization: `Bearer ${nonMemberToken}` },
        body: JSON.stringify({
          owner: "company",
          repo: "dev4ai",
        }),
      });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    // ------------------------------------------------------------------
    // 4. Get & Unlink: GET / DELETE /tickets/:ticketId/github-issue
    // ------------------------------------------------------------------
    console.log("\n--- 4. Query and Unlink GitHub Issue from Ticket ---");

    await test("GET /tickets/:ticketId/github-issue returns linked GitHub issue", async () => {
      const res = await request(`/tickets/${ticketId}/github-issue`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.ticketId, ticketId);
      assert.equal(res.body.data.githubIssueNumber, 99);
    });

    await test("GET /tickets/:ticketId/github-issue for unlinked ticket returns 404", async () => {
      // Create another unlinked ticket
      const [newTicket] = await db
        .insert(tickets)
        .values({
          squadId,
          sprintId,
          title: "Unlinked test ticket",
          status: "TODO",
          createdBy: memberUserId,
        })
        .returning();

      const res = await request(`/tickets/${newTicket.id}/github-issue`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
    });

    await test("DELETE /tickets/:ticketId/github-issue successfully unlinks issue", async () => {
      const res = await request(`/tickets/${ticketId}/github-issue`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${memberToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // Verify record is gone
      const verifyRes = await request(`/tickets/${ticketId}/github-issue`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      assert.equal(verifyRes.status, 404);

      // Verify activity log was recorded
      const [unlinkedActivity] = await db
        .select()
        .from(activityLogs)
        .where(
          and(
            eq(activityLogs.ticketId, ticketId),
            eq(activityLogs.action, "GITHUB_ISSUE_UNLINKED")
          )
        );
      assert.ok(unlinkedActivity, "Activity log for unlinking must exist");
    });

    // ------------------------------------------------------------------
    // 5. GitHub API Error Handling
    // ------------------------------------------------------------------
    console.log("\n--- 5. GitHub API Error Handling ---");

    await test("GitHub 404 when importing non-existent issue returns 404", async () => {
      mockState.singleIssueStatus = 404;
      const res = await request("/github/repos/company/dev4ai/issues/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({
          issueNumber: 99999,
          squadId,
          sprintId,
        }),
      });

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      mockState.singleIssueStatus = 200;
    });

    await test("GitHub 500 when exporting ticket returns 502", async () => {
      mockState.createIssueStatus = 500;
      // ticketId is now unlinked, so we can try exporting again
      const res = await request(`/github/tickets/${ticketId}/issue`, {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({
          owner: "company",
          repo: "dev4ai",
        }),
      });

      assert.equal(res.status, 502);
      assert.equal(res.body.success, false);
      mockState.createIssueStatus = 201;
    });

    await test("GitHub API timeout returns 504", async () => {
      mockState.simulateTimeout = true;
      const res = await request("/github/repos/company/dev4ai/issues", {
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
  console.log(`📊 GITHUB ISSUES TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("========================================================\n");

  if (failedTests.length > 0) {
    console.log("Failed tests summary:");
    failedTests.forEach((f) => console.log(`  - ${f.name}: ${f.error}`));
    console.log("");
  }

  process.exit(failed > 0 ? 1 : 0);
}

runIssueTests().catch((err) => {
  console.error("Test runner fatal error:", err);
  process.exit(1);
});
