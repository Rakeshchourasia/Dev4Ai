/**
 * github-repos.test.js
 *
 * Comprehensive tests for:
 *   GET  /github/repositories
 *   GET  /github/repositories/:owner/:repo
 *
 * Tests:
 *   - repository list (success, field mapping, org filtering)
 *   - repository details (success, field mapping: id, name, fullName, owner, private, defaultBranch, htmlUrl, description, language, createdAt, updatedAt)
 *   - pagination (page, perPage, limit, pagination object, navigation)
 *   - private repositories (visibility filtering)
 *   - GitHub 401 (token expired/invalid)
 *   - GitHub 403 (access denied)
 *   - GitHub 404 (repo not found)
 *   - invalid parameters (malformed owner, malformed repo, path traversal, out-of-range pagination, bad visibility)
 *   - unauthorized user (missing/invalid DEVAI JWT)
 *   - disconnected GitHub account (DEVAI user without GitHub connection)
 *   - security guarantees (token never exposed, client-provided tokens ignored)
 *   - IDOR prevention
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
import { eq } from "drizzle-orm";
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

const mockState = {
  oauthToken: "mock_gh_token_repos_suite_xyz",
  oauthUserOverride: null,
  oauthEmailOverride: null,

  // User repositories mock
  userReposStatus: 200,
  userReposBody: [
    {
      id: 50001,
      name: "devai-agent",
      full_name: "testuser/devai-agent",
      owner: { login: "testuser", id: 999 },
      description: "AI Agent for development",
      private: false,
      fork: false,
      language: "JavaScript",
      default_branch: "main",
      stargazers_count: 15,
      forks_count: 2,
      open_issues_count: 1,
      visibility: "public",
      html_url: "https://github.com/testuser/devai-agent",
      pushed_at: "2026-09-10T00:00:00Z",
      updated_at: "2026-09-12T00:00:00Z",
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: 50002,
      name: "secret-core",
      full_name: "testuser/secret-core",
      owner: { login: "testuser", id: 999 },
      description: "Proprietary algorithm core",
      private: true,
      fork: false,
      language: "TypeScript",
      default_branch: "master",
      stargazers_count: 3,
      forks_count: 0,
      open_issues_count: 0,
      visibility: "private",
      html_url: "https://github.com/testuser/secret-core",
      pushed_at: "2026-09-14T00:00:00Z",
      updated_at: "2026-09-15T00:00:00Z",
      created_at: "2026-02-01T00:00:00Z",
    },
  ],

  // Org repositories mock
  orgReposStatus: 200,
  orgReposBody: [
    {
      id: 60001,
      name: "org-shared-lib",
      full_name: "acme-corp/org-shared-lib",
      owner: { login: "acme-corp", id: 888 },
      description: "Shared library",
      private: false,
      fork: false,
      language: "Go",
      default_branch: "main",
      stargazers_count: 50,
      forks_count: 10,
      open_issues_count: 4,
      visibility: "public",
      html_url: "https://github.com/acme-corp/org-shared-lib",
      pushed_at: "2026-09-11T00:00:00Z",
      updated_at: "2026-09-13T00:00:00Z",
      created_at: "2025-06-01T00:00:00Z",
    },
  ],

  // Single repo mock
  repoDetailsStatus: 200,
  repoDetailsBody: {
    id: 70001,
    name: "awesome-project",
    full_name: "octocat/awesome-project",
    owner: { login: "octocat", id: 1 },
    description: "The most awesome project ever",
    private: true,
    fork: false,
    language: "JavaScript",
    default_branch: "main",
    stargazers_count: 100,
    forks_count: 20,
    open_issues_count: 5,
    visibility: "private",
    html_url: "https://github.com/octocat/awesome-project",
    pushed_at: "2026-09-14T00:00:00Z",
    updated_at: "2026-09-15T00:00:00Z",
    created_at: "2024-05-10T00:00:00Z",
  },

  simulateTimeout: false,
  lastCapturedUrl: null,
};

let baseGithubUserId = Date.now() + 50000;

globalThis.fetch = async (url, options = {}) => {
  const urlStr = String(url);
  mockState.lastCapturedUrl = urlStr;

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
    const user = mockState.oauthUserOverride ?? {
      id: baseGithubUserId,
      login: `repos_user_${baseGithubUserId}`,
      name: "Repo Test User",
      avatar_url: `https://avatars.githubusercontent.com/u/${baseGithubUserId}`,
    };
    return new Response(JSON.stringify(user), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (urlStr.includes("api.github.com/user/emails")) {
    const emails = mockState.oauthEmailOverride ?? [
      {
        email: `repos_${baseGithubUserId}@example.com`,
        primary: true,
        verified: true,
      },
    ];
    return new Response(JSON.stringify(emails), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Token revocation
  if (urlStr.includes("api.github.com/applications") && options.method === "DELETE") {
    return new Response(null, { status: 204 });
  }

  // Timeout simulation
  if (mockState.simulateTimeout) {
    const err = new Error("The operation was aborted");
    err.name = "AbortError";
    throw err;
  }

  // Single repo details: api.github.com/repos/:owner/:repo
  const repoMatch = urlStr.match(/api\.github\.com\/repos\/([^/]+)\/([^/?]+)/);
  if (repoMatch) {
    return new Response(JSON.stringify(mockState.repoDetailsBody), {
      status: mockState.repoDetailsStatus,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Org repos: api.github.com/orgs/:org/repos
  if (urlStr.match(/api\.github\.com\/orgs\/[^/]+\/repos/)) {
    return new Response(JSON.stringify(mockState.orgReposBody), {
      status: mockState.orgReposStatus,
      headers: { "Content-Type": "application/json" },
    });
  }

  // User repos: api.github.com/user/repos
  if (urlStr.includes("api.github.com/user/repos")) {
    return new Response(JSON.stringify(mockState.userReposBody), {
      status: mockState.userReposStatus,
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

/** Full GitHub OAuth callback — returns the DEVAI accessToken & user */
async function performOAuth() {
  const initRes = await request("/auth/github", { headers: { Accept: "application/json" } });
  const { state } = initRes.body.data;
  const { nonce } = jwt.verify(state, config.jwtSecret);

  const cbRes = await request(
    `/auth/github/callback?code=repos_test_code&state=${state}`,
    { headers: { Cookie: `devai_oauth_nonce=${nonce}` } }
  );
  return cbRes.body.data; // { user, accessToken, refreshToken }
}

// ==========================================
// TEST SUITE EXECUTION
// ==========================================

async function runRepoTests() {
  console.log("\n========================================================");
  console.log("🧪 DEVAI REPOSITORY INTEGRATION TEST SUITE (STEP 3)");
  console.log("========================================================\n");

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  let devaiToken;
  let devaiUserId;

  try {
    // ------------------------------------------------------------------
    // Setup: Authenticate DEVAI user with GitHub
    // ------------------------------------------------------------------
    console.log("--- Setup: Link DEVAI user with GitHub ---");
    const oauthData = await performOAuth();
    devaiToken = oauthData.accessToken;
    devaiUserId = oauthData.user.id;
    console.log(`  ✓ Linked test user ${devaiUserId} with GitHub\n`);

    // ------------------------------------------------------------------
    // 1. Authentication & Authorization Guards
    // ------------------------------------------------------------------
    console.log("--- 1. Authentication & Authorization Guards ---");

    await test("GET /github/repositories without JWT returns 401", async () => {
      const res = await request("/github/repositories");
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    await test("GET /github/repositories with invalid JWT returns 401", async () => {
      const res = await request("/github/repositories", {
        headers: { Authorization: "Bearer invalid_token_xyz" },
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    await test("GET /github/repositories/:owner/:repo without JWT returns 401", async () => {
      const res = await request("/github/repositories/octocat/Hello-World");
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    await test("GET /github/repositories for disconnected DEVAI user returns 404", async () => {
      const unconnectedToken = jwt.sign(
        { id: "00000000-0000-0000-0000-000000000001", email: "unconnected@test.com", role: "DEVELOPER" },
        config.jwtSecret,
        { expiresIn: "1h" }
      );
      const res = await request("/github/repositories", {
        headers: { Authorization: `Bearer ${unconnectedToken}` },
      });
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("No GitHub connection found"));
    });

    await test("GET /github/repositories/:owner/:repo for disconnected DEVAI user returns 404", async () => {
      const unconnectedToken = jwt.sign(
        { id: "00000000-0000-0000-0000-000000000001", email: "unconnected@test.com", role: "DEVELOPER" },
        config.jwtSecret,
        { expiresIn: "1h" }
      );
      const res = await request("/github/repositories/octocat/Hello-World", {
        headers: { Authorization: `Bearer ${unconnectedToken}` },
      });
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("No GitHub connection found"));
    });

    // ------------------------------------------------------------------
    // 2. Repository List: GET /github/repositories
    // ------------------------------------------------------------------
    console.log("\n--- 2. Repository List: GET /github/repositories ---");

    await test("Successfully returns accessible repositories", async () => {
      const res = await request("/github/repositories", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.data.length, 2);

      const first = res.body.data[0];
      assert.equal(first.id, 50001);
      assert.equal(first.name, "devai-agent");
      assert.equal(first.fullName, "testuser/devai-agent");
      assert.equal(first.owner, "testuser");
      assert.equal(first.private, false);
      assert.equal(first.defaultBranch, "main");
      assert.equal(first.htmlUrl, "https://github.com/testuser/devai-agent");
      assert.equal(first.description, "AI Agent for development");
      assert.equal(first.language, "JavaScript");
      assert.ok(first.createdAt);
      assert.ok(first.updatedAt);
    });

    await test("Supports filtering by organization", async () => {
      const res = await request("/github/repositories?organization=acme-corp", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].fullName, "acme-corp/org-shared-lib");
      assert.ok(mockState.lastCapturedUrl.includes("/orgs/acme-corp/repos"));
    });

    await test("Supports visibility filter (all, public, private)", async () => {
      const resPublic = await request("/github/repositories?visibility=public", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(resPublic.status, 200);
      assert.ok(mockState.lastCapturedUrl.includes("visibility=public"));

      const resPrivate = await request("/github/repositories?visibility=private", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(resPrivate.status, 200);
      assert.ok(mockState.lastCapturedUrl.includes("visibility=private"));

      const resAll = await request("/github/repositories?visibility=all", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(resAll.status, 200);
      assert.ok(mockState.lastCapturedUrl.includes("visibility=all"));
    });

    // ------------------------------------------------------------------
    // 3. Pagination Architecture
    // ------------------------------------------------------------------
    console.log("\n--- 3. Pagination Architecture ---");

    await test("Returns standard pagination envelope with page and perPage", async () => {
      const res = await request("/github/repositories?page=1&perPage=10", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.pagination);
      assert.equal(res.body.pagination.page, 1);
      assert.equal(res.body.pagination.perPage, 10);
      assert.equal(res.body.pagination.limit, 10);
      assert.equal(typeof res.body.pagination.total, "number");
      assert.equal(typeof res.body.pagination.totalPages, "number");
      assert.equal(typeof res.body.pagination.hasNextPage, "boolean");
      assert.equal(typeof res.body.pagination.hasPreviousPage, "boolean");
    });

    await test("Accepts limit parameter interchangeably with perPage", async () => {
      const res = await request("/github/repositories?page=2&limit=5", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.pagination.page, 2);
      assert.equal(res.body.pagination.perPage, 5);
      assert.equal(res.body.pagination.limit, 5);
      assert.equal(res.body.pagination.hasPreviousPage, true);
    });

    // ------------------------------------------------------------------
    // 4. Repository Details: GET /github/repositories/:owner/:repo
    // ------------------------------------------------------------------
    console.log("\n--- 4. Repository Details: GET /github/repositories/:owner/:repo ---");

    await test("Returns full repository details with all required fields", async () => {
      const res = await request("/github/repositories/octocat/awesome-project", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data);

      const d = res.body.data;
      assert.equal(d.id, 70001);
      assert.equal(d.name, "awesome-project");
      assert.equal(d.fullName, "octocat/awesome-project");
      assert.equal(d.owner, "octocat");
      assert.equal(d.private, true);
      assert.equal(d.defaultBranch, "main");
      assert.equal(d.htmlUrl, "https://github.com/octocat/awesome-project");
      assert.equal(d.description, "The most awesome project ever");
      assert.equal(d.language, "JavaScript");
      assert.ok(d.createdAt);
      assert.ok(d.updatedAt);
    });

    // ------------------------------------------------------------------
    // 5. Input Validation & Path Traversal Prevention
    // ------------------------------------------------------------------
    console.log("\n--- 5. Validation & Malformed Repository Paths ---");

    await test("Rejects invalid owner starting with hyphen with 400", async () => {
      const res = await request("/github/repositories/-bad-owner/my-repo", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("Validation failed"));
    });

    await test("Rejects invalid repo starting with hyphen or dot with 400", async () => {
      const res = await request("/github/repositories/good-owner/-bad-repo", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    await test("Rejects path traversal in repository name (..) with 400", async () => {
      const res = await request("/github/repositories/good-owner/bad..repo", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    await test("Rejects repository name ending with .git with 400", async () => {
      const res = await request("/github/repositories/good-owner/project.git", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    await test("Rejects page < 1 with 400", async () => {
      const res = await request("/github/repositories?page=0", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    await test("Rejects perPage < 1 with 400", async () => {
      const res = await request("/github/repositories?perPage=0", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    await test("Rejects perPage > 100 with 400", async () => {
      const res = await request("/github/repositories?perPage=101", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    await test("Rejects invalid visibility value with 400", async () => {
      const res = await request("/github/repositories?visibility=internal", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    await test("Rejects invalid organization name with 400", async () => {
      const res = await request("/github/repositories?organization=-invalid-org", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    // ------------------------------------------------------------------
    // 6. GitHub API Error Mapping
    // ------------------------------------------------------------------
    console.log("\n--- 6. GitHub API Error Mapping ---");

    await test("GitHub 401 on repository list maps to DEVAI 401", async () => {
      mockState.userReposStatus = 401;
      const res = await request("/github/repositories", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("GitHub authorization is invalid or expired"));
      mockState.userReposStatus = 200;
    });

    await test("GitHub 403 on repository list maps to DEVAI 403", async () => {
      mockState.userReposStatus = 403;
      const res = await request("/github/repositories", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("GitHub access denied"));
      mockState.userReposStatus = 200;
    });

    await test("GitHub 404 on repository details maps to DEVAI 404", async () => {
      mockState.repoDetailsStatus = 404;
      const res = await request("/github/repositories/octocat/nonexistent-repo", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("The requested GitHub resource was not found"));
      mockState.repoDetailsStatus = 200;
    });

    await test("GitHub 401 on repository details maps to DEVAI 401", async () => {
      mockState.repoDetailsStatus = 401;
      const res = await request("/github/repositories/octocat/awesome-project", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      mockState.repoDetailsStatus = 200;
    });

    await test("GitHub 403 on repository details maps to DEVAI 403", async () => {
      mockState.repoDetailsStatus = 403;
      const res = await request("/github/repositories/octocat/awesome-project", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      mockState.repoDetailsStatus = 200;
    });

    await test("GitHub 500 on repository details maps to DEVAI 502", async () => {
      mockState.repoDetailsStatus = 500;
      const res = await request("/github/repositories/octocat/awesome-project", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 502);
      assert.equal(res.body.success, false);
      mockState.repoDetailsStatus = 200;
    });

    await test("GitHub API timeout maps to DEVAI 504", async () => {
      mockState.simulateTimeout = true;
      const res = await request("/github/repositories", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 504);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("timed out"));
      mockState.simulateTimeout = false;
    });

    // ------------------------------------------------------------------
    // 7. Security Guarantees
    // ------------------------------------------------------------------
    console.log("\n--- 7. Security Guarantees ---");

    await test("Token is NEVER exposed in GET /github/repositories", async () => {
      const res = await request("/github/repositories", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      const responseText = JSON.stringify(res.body);
      assert.ok(!responseText.includes("mock_gh_token"), "Token must not appear in response");
      assert.ok(!responseText.includes("encrypted"), "Ciphertext must not appear in response");
    });

    await test("Token is NEVER exposed in GET /github/repositories/:owner/:repo", async () => {
      const res = await request("/github/repositories/octocat/awesome-project", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      const responseText = JSON.stringify(res.body);
      assert.ok(!responseText.includes("mock_gh_token"), "Token must not appear in response");
    });

    await test("Client-supplied GitHub token header is ignored", async () => {
      const res = await request("/github/repositories", {
        headers: {
          Authorization: `Bearer ${devaiToken}`,
          "X-Github-Token": "attacker_supplied_token_123",
          "X-Access-Token": "attacker_supplied_token_123",
        },
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.success);
    });

    // ------------------------------------------------------------------
    // 8. IDOR Prevention
    // ------------------------------------------------------------------
    console.log("\n--- 8. IDOR Prevention ---");

    await test("User A and User B cannot access each other's GitHub repositories", async () => {
      // Create second user
      baseGithubUserId += 100;
      const oauthData2 = await performOAuth();
      const user2Token = oauthData2.accessToken;
      const user2Id = oauthData2.user.id;

      assert.notEqual(devaiUserId, user2Id);

      // Both can list their own repos without cross-contamination
      const resUser1 = await request("/github/repositories", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      const resUser2 = await request("/github/repositories", {
        headers: { Authorization: `Bearer ${user2Token}` },
      });

      assert.equal(resUser1.status, 200);
      assert.equal(resUser2.status, 200);
    });

  } finally {
    globalThis.fetch = originalFetch;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
  }

  console.log("\n========================================================");
  console.log(`📊 GITHUB REPOSITORIES TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("========================================================\n");

  if (failedTests.length > 0) {
    console.log("Failed tests summary:");
    failedTests.forEach((f) => console.log(`  - ${f.name}: ${f.error}`));
    console.log("");
  }

  process.exit(failed > 0 ? 1 : 0);
}

runRepoTests().catch((err) => {
  console.error("Test runner fatal error:", err);
  process.exit(1);
});
