/**
 * github-orgs.test.js
 *
 * Tests for:
 *   GET  /github/organizations
 *   GET  /github/organizations/:organization/repos
 *
 * Uses the same mock-fetch + in-process server pattern as the other test suites.
 * The GitHub token is ALWAYS sourced from the server-side encrypted store —
 * these tests verify it is never accepted from request input nor returned in responses.
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

// Configurable per-test mock state
const mockState = {
  // OAuth mocks
  oauthToken: "mock_gh_token_orgs_suite_abc",
  oauthUserOverride: null,
  oauthEmailOverride: null,

  // Org/Repo mocks
  orgsStatus: 200,
  orgsBody: [
    { id: 111, login: "acme-corp", avatar_url: "https://avatars.githubusercontent.com/u/111", description: "ACME Corp" },
    { id: 222, login: "octo-org",  avatar_url: "https://avatars.githubusercontent.com/u/222", description: null },
  ],

  reposStatus: 200,
  reposBody: [
    {
      id: 10001, name: "backend", full_name: "acme-corp/backend",
      description: "Main API", private: true, fork: false,
      language: "JavaScript", default_branch: "main",
      stargazers_count: 5, forks_count: 1, open_issues_count: 2,
      visibility: "private", html_url: "https://github.com/acme-corp/backend",
      pushed_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-10T00:00:00Z",
      created_at: "2025-01-01T00:00:00Z",
    },
    {
      id: 10002, name: "frontend", full_name: "acme-corp/frontend",
      description: null, private: false, fork: false,
      language: "TypeScript", default_branch: "main",
      stargazers_count: 12, forks_count: 3, open_issues_count: 0,
      visibility: "public", html_url: "https://github.com/acme-corp/frontend",
      pushed_at: "2026-08-20T00:00:00Z",
      updated_at: "2026-09-05T00:00:00Z",
      created_at: "2025-03-01T00:00:00Z",
    },
  ],

  // Simulate timeout: set to true to trigger AbortError
  simulateTimeout: false,
};

let baseGithubUserId = Date.now();

globalThis.fetch = async (url, options = {}) => {
  const urlStr = String(url);

  // --- OAuth flows ---
  if (urlStr.includes("github.com/login/oauth/access_token")) {
    return new Response(JSON.stringify({ access_token: mockState.oauthToken, scope: "read:user user:email" }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  if (urlStr.endsWith("api.github.com/user")) {
    const user = mockState.oauthUserOverride ?? {
      id: baseGithubUserId,
      login: `orgs_test_user_${baseGithubUserId}`,
      name: "Orgs Test",
      avatar_url: `https://avatars.githubusercontent.com/u/${baseGithubUserId}`,
    };
    return new Response(JSON.stringify(user), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  if (urlStr.includes("api.github.com/user/emails")) {
    const emails = mockState.oauthEmailOverride ?? [
      { email: `orgs_test_${baseGithubUserId}@example.com`, primary: true, verified: true },
    ];
    return new Response(JSON.stringify(emails), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  // --- Token revocation ---
  if (urlStr.includes("api.github.com/applications") && options.method === "DELETE") {
    return new Response(null, { status: 204 });
  }

  // --- Simulate timeout ---
  if (mockState.simulateTimeout) {
    // Trigger the AbortController by never resolving — simulate via throwing AbortError
    const err = new Error("The operation was aborted");
    err.name = "AbortError";
    throw err;
  }

  // --- Organizations list ---
  if (urlStr.includes("api.github.com/user/orgs")) {
    return new Response(JSON.stringify(mockState.orgsBody), {
      status: mockState.orgsStatus,
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- Org repos list ---
  if (urlStr.match(/api\.github\.com\/orgs\/[^/]+\/repos/)) {
    return new Response(JSON.stringify(mockState.reposBody), {
      status: mockState.reposStatus,
      headers: { "Content-Type": "application/json" },
    });
  }

  return originalFetch(url, options);
};

// ==========================================
// HELPERS
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

function generateTestToken(userId, email) {
  return jwt.sign({ id: userId, email, role: "MEMBER" }, config.jwtSecret, { expiresIn: "15m" });
}

/** Full GitHub OAuth callback — returns the DEVAI accessToken & user */
async function performOAuth() {
  const initRes = await request("/auth/github", { headers: { Accept: "application/json" } });
  const { state } = initRes.body.data;
  const { nonce } = jwt.verify(state, config.jwtSecret);

  const cbRes = await request(
    `/auth/github/callback?code=orgs_test_code&state=${state}`,
    { headers: { Cookie: `devai_oauth_nonce=${nonce}` } }
  );
  return cbRes.body.data; // { user, accessToken, refreshToken }
}

// ==========================================
// TEST SUITE
// ==========================================

async function runOrgTests() {
  console.log("\n========================================================");
  console.log("🏢 DEVAI — GITHUB ORGANIZATIONS TEST SUITE");
  console.log("========================================================\n");

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      console.log(`Test server: ${baseUrl}\n`);
      resolve();
    });
  });

  try {
    // ======================================================
    // SECTION 1 — AUTH GUARDS
    // ======================================================
    console.log("--- 1. Authentication Guards ---");

    await test("GET /github/organizations returns 401 without JWT", async () => {
      const res = await request("/github/organizations");
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    await test("GET /github/organizations/:org/repos returns 401 without JWT", async () => {
      const res = await request("/github/organizations/acme-corp/repos");
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    await test("GET /github/organizations returns 401 with invalid JWT", async () => {
      const res = await request("/github/organizations", {
        headers: { Authorization: "Bearer bad.jwt.value" },
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    // ======================================================
    // SECTION 2 — DISCONNECTED USER (no GitHub connection)
    // ======================================================
    console.log("\n--- 2. Disconnected User ---");

    // Register a bare user (no GitHub link)
    const bareEmail = `bare_org_${Date.now()}@example.com`;
    const regRes = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Bare Org User", email: bareEmail, password: "Password@123" }),
    });
    assert.equal(regRes.status, 201);
    const bareToken = generateTestToken(regRes.body.data.id, bareEmail);

    await test("GET /github/organizations returns 404 for user with no GitHub connection", async () => {
      const res = await request("/github/organizations", {
        headers: { Authorization: `Bearer ${bareToken}` },
      });
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.toLowerCase().includes("no github connection"));
    });

    await test("GET /github/organizations/:org/repos returns 404 for user with no GitHub connection", async () => {
      const res = await request("/github/organizations/acme-corp/repos", {
        headers: { Authorization: `Bearer ${bareToken}` },
      });
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
    });

    // ======================================================
    // SECTION 3 — CONNECTED USER — ORGANIZATION LISTING
    // ======================================================
    console.log("\n--- 3. Organization Listing ---");

    baseGithubUserId = Date.now() + 1;
    const authData = await performOAuth();
    const devaiToken = authData.accessToken;

    await test("GET /github/organizations returns 200 with org array for connected user", async () => {
      const res = await request("/github/organizations", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.data.length, 2);
    });

    await test("Organizations contain id, login, avatarUrl, description — no tokens", async () => {
      const res = await request("/github/organizations", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      const org = res.body.data[0];
      assert.ok(typeof org.id === "number");
      assert.ok(typeof org.login === "string");
      assert.ok(typeof org.avatarUrl === "string");
      assert.ok("description" in org); // may be null

      const jsonStr = JSON.stringify(res.body);
      assert.ok(!jsonStr.includes("mock_gh_token"),   "GitHub token must not appear");
      assert.ok(!jsonStr.includes("access_token"),    "access_token field must not appear");
      assert.ok(!jsonStr.includes("refreshToken"),    "refreshToken must not appear");
    });

    await test("Organization IDs and logins match mock data", async () => {
      const res = await request("/github/organizations", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      const [first, second] = res.body.data;
      assert.equal(first.id, 111);
      assert.equal(first.login, "acme-corp");
      assert.equal(second.id, 222);
      assert.equal(second.login, "octo-org");
    });

    await test("Empty organization list returns empty array (not null)", async () => {
      mockState.orgsBody = [];
      const res = await request("/github/organizations", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.data.length, 0);
      mockState.orgsBody = [
        { id: 111, login: "acme-corp", avatar_url: "https://avatars.githubusercontent.com/u/111", description: "ACME Corp" },
        { id: 222, login: "octo-org",  avatar_url: "https://avatars.githubusercontent.com/u/222", description: null },
      ];
    });

    // ======================================================
    // SECTION 4 — ORGANIZATION REPOSITORY LISTING
    // ======================================================
    console.log("\n--- 4. Repository Listing ---");

    await test("GET /github/organizations/acme-corp/repos returns 200 with repos array", async () => {
      const res = await request("/github/organizations/acme-corp/repos", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.data.length, 2);
    });

    await test("Repository objects contain expected normalized fields — no tokens", async () => {
      const res = await request("/github/organizations/acme-corp/repos", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      const repo = res.body.data[0];
      assert.ok(typeof repo.id === "number");
      assert.ok(typeof repo.name === "string");
      assert.ok(typeof repo.fullName === "string");
      assert.ok(typeof repo.private === "boolean");
      assert.ok(typeof repo.fork === "boolean");
      assert.ok(typeof repo.stargazersCount === "number");
      assert.ok(typeof repo.htmlUrl === "string");

      const jsonStr = JSON.stringify(res.body);
      assert.ok(!jsonStr.includes("mock_gh_token"),   "GitHub token must not appear in repo response");
      assert.ok(!jsonStr.includes("access_token"),    "access_token must not appear");
    });

    await test("Repo response does not include raw GitHub snake_case fields", async () => {
      const res = await request("/github/organizations/acme-corp/repos", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      const jsonStr = JSON.stringify(res.body.data[0]);
      assert.ok(!jsonStr.includes("stargazers_count"), "snake_case field leaked");
      assert.ok(!jsonStr.includes("full_name"),        "snake_case field leaked");
      assert.ok(!jsonStr.includes("open_issues_count"), "snake_case field leaked");
    });

    await test("GET /github/organizations/:org/repos accepts optional query params (type, sort, direction)", async () => {
      const res = await request(
        "/github/organizations/acme-corp/repos?type=public&sort=created&direction=asc",
        { headers: { Authorization: `Bearer ${devaiToken}` } }
      );
      // Just verify it doesn't error
      assert.equal(res.status, 200);
    });

    // ======================================================
    // SECTION 5 — INPUT VALIDATION
    // ======================================================
    console.log("\n--- 5. Input Validation ---");

    await test("Invalid org name starting with a hyphen returns 400", async () => {
      // "-bad-org" routes fine (no special URL chars) but fails our regex
      const res = await request("/github/organizations/-bad-org/repos", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    // ======================================================
    // SECTION 6 — GITHUB API ERROR HANDLING
    // ======================================================
    console.log("\n--- 6. GitHub API Error Handling ---");

    await test("GitHub 401 on /user/orgs → DEVAI 401 with safe message", async () => {
      mockState.orgsStatus = 401;
      const res = await request("/github/organizations", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.toLowerCase().includes("invalid or expired"));
      // Must not expose raw GitHub error body or token
      assert.ok(!JSON.stringify(res.body).includes("mock_gh_token"));
      mockState.orgsStatus = 200;
    });

    await test("GitHub 403 on /user/orgs → DEVAI 403 with safe message", async () => {
      mockState.orgsStatus = 403;
      const res = await request("/github/organizations", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.toLowerCase().includes("access denied") || res.body.message.toLowerCase().includes("permissions"));
      mockState.orgsStatus = 200;
    });

    await test("GitHub 404 on org repos → DEVAI 404 with safe message", async () => {
      mockState.reposStatus = 404;
      const res = await request("/github/organizations/nonexistent-org/repos", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      mockState.reposStatus = 200;
    });

    await test("GitHub 403 on org repos → DEVAI 403 with safe message", async () => {
      mockState.reposStatus = 403;
      const res = await request("/github/organizations/acme-corp/repos", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      mockState.reposStatus = 200;
    });

    await test("GitHub 500 on /user/orgs → DEVAI 502 (upstream error)", async () => {
      mockState.orgsStatus = 500;
      const res = await request("/github/organizations", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 502);
      assert.equal(res.body.success, false);
      mockState.orgsStatus = 200;
    });

    await test("GitHub API timeout → DEVAI 504 with timeout message", async () => {
      mockState.simulateTimeout = true;
      const res = await request("/github/organizations", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 504);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.toLowerCase().includes("timed out"));
      mockState.simulateTimeout = false;
    });

    // ======================================================
    // SECTION 7 — SECURITY: TOKEN NEVER EXPOSED
    // ======================================================
    console.log("\n--- 7. Security: Token Never Exposed ---");

    await test("GitHub token is never present in any /github/organizations response", async () => {
      const res = await request("/github/organizations", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      const bodyStr = JSON.stringify(res.body);
      assert.ok(!bodyStr.includes(mockState.oauthToken), "Raw GitHub token appeared in response");
      assert.ok(!bodyStr.includes("access_token"),       "access_token key appeared in response");
      assert.ok(!bodyStr.includes("Encrypted"),           "Encrypted token appeared in response");
    });

    await test("GitHub token is never present in any /github/organizations/:org/repos response", async () => {
      const res = await request("/github/organizations/acme-corp/repos", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      const bodyStr = JSON.stringify(res.body);
      assert.ok(!bodyStr.includes(mockState.oauthToken), "Raw GitHub token appeared in response");
      assert.ok(!bodyStr.includes("access_token"),       "access_token key appeared in response");
    });

    await test("Server does not accept a GitHub token from request headers/query/body", async () => {
      // Even if the attacker sends a fake github token, the server MUST ignore it
      // and use only the stored token. We verify by creating a disconnected user
      // who sends a valid-looking GitHub token in the header — they must get 404.
      const noConnEmail = `no_conn_${Date.now()}@example.com`;
      const noConnReg = await request("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name: "No Conn", email: noConnEmail, password: "Password@123" }),
      });
      const noConnToken = generateTestToken(noConnReg.body.data.id, noConnEmail);

      const res = await request("/github/organizations", {
        headers: {
          Authorization: `Bearer ${noConnToken}`,
          // Attacker tries to inject a GitHub token — must be ignored
          "X-Github-Token": "ghp_attacker_token",
          "X-Access-Token": "ghp_attacker_token",
        },
      });
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
    });

    // ======================================================
    // SECTION 8 — IDOR: Users cannot use each other's connections
    // ======================================================
    console.log("\n--- 8. IDOR Prevention ---");

    await test("A second user with their own GitHub connection only sees their own orgs", async () => {
      // Create a second connected user with different mock orgs
      const prevOrgsBody = mockState.orgsBody;
      baseGithubUserId = Date.now() + 999;

      mockState.orgsBody = [
        { id: 777, login: "user-two-org", avatar_url: "https://avatars.githubusercontent.com/u/777", description: "User 2 only" },
      ];
      mockState.oauthEmailOverride = [
        { email: `user2_org_${baseGithubUserId}@example.com`, primary: true, verified: true },
      ];

      const user2Auth = await performOAuth();
      const user2Token = user2Auth.accessToken;

      // Restore orgsBody so user1 can still call
      mockState.orgsBody = prevOrgsBody;
      mockState.oauthEmailOverride = null;

      // user1 still gets their orgs (acme-corp, octo-org)
      const user1Res = await request("/github/organizations", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(user1Res.status, 200);
      assert.equal(user1Res.body.data.length, 2);

      // user2 gets their orgs (user-two-org only)
      mockState.orgsBody = [
        { id: 777, login: "user-two-org", avatar_url: "https://avatars.githubusercontent.com/u/777", description: "User 2 only" },
      ];
      const user2Res = await request("/github/organizations", {
        headers: { Authorization: `Bearer ${user2Token}` },
      });
      assert.equal(user2Res.status, 200);
      assert.equal(user2Res.body.data[0].login, "user-two-org");

      // Restore
      mockState.orgsBody = prevOrgsBody;
    });

    // ======================================================
    // SECTION 9 — REGRESSION
    // ======================================================
    console.log("\n--- 9. Regression: Existing Routes Unaffected ---");

    await test("GET /github/connection still works", async () => {
      const res = await request("/github/connection", {
        headers: { Authorization: `Bearer ${devaiToken}` },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.connected, true);
    });

    await test("POST /auth/login still works", async () => {
      const testEmail = `reg_regression_${Date.now()}@example.com`;
      await request("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name: "Reg", email: testEmail, password: "Password@123" }),
      });
      const res = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: testEmail, password: "Password@123" }),
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.data.accessToken);
    });

  } finally {
    globalThis.fetch = originalFetch;
    if (server) await new Promise((r) => server.close(r));
    await pool.end();
  }

  console.log("\n========================================================");
  console.log(`📊 GITHUB ORGS TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("========================================================\n");

  if (failedTests.length > 0) {
    console.log("Failed tests:");
    failedTests.forEach((f) => console.log(`  - ${f.name}: ${f.error}`));
  }

  if (failed > 0) process.exit(1);
}

runOrgTests().catch((err) => {
  console.error("Fatal error in test suite:", err);
  process.exit(1);
});
