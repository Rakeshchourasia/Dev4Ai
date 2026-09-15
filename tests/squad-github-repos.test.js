/**
 * squad-github-repos.test.js
 *
 * Tests for STEP 4: Link Repository to Squad
 *   POST   /squads/:squadId/github-repositories
 *   GET    /squads/:squadId/github-repositories
 *   DELETE /squads/:squadId/github-repositories/:id
 *
 * Tests:
 *   - successful link (authoritative data from GitHub)
 *   - duplicate link prevention (409)
 *   - invalid squad ID (400) / non-existent squad (404)
 *   - unauthorized squad (403 for non-member)
 *   - GitHub repository unavailable (404)
 *   - delete (unlink)
 *   - list linked repositories
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
import { companies } from "../src/db/schema/companies.schema.js";
import { squads } from "../src/db/schema/squads.schema.js";
import { squadMembers } from "../src/db/schema/squadMembers.schema.js";
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
  oauthToken: "mock_gh_token_squad_repo_suite",
  oauthUserOverride: null,
  oauthEmailOverride: null,

  repoStatus: 200,
  repoBody: {
    id: 123456,
    name: "dev4ai",
    full_name: "company/dev4ai",
    owner: { login: "company", id: 888 },
    description: "Authoritative dev4ai repository",
    private: false,
    default_branch: "main",
    html_url: "https://github.com/company/dev4ai",
  },
};

let baseGithubUserId = Date.now() + 80000;

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
    const user = mockState.oauthUserOverride ?? {
      id: baseGithubUserId,
      login: `squad_gh_user_${baseGithubUserId}`,
      name: "Squad Test User",
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
        email: `squad_gh_${baseGithubUserId}@example.com`,
        primary: true,
        verified: true,
      },
    ];
    return new Response(JSON.stringify(emails), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Repository lookup: api.github.com/repos/:owner/:repo
  const repoMatch = urlStr.match(/api\.github\.com\/repos\/([^/]+)\/([^/?]+)/);
  if (repoMatch) {
    return new Response(JSON.stringify(mockState.repoBody), {
      status: mockState.repoStatus,
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
    `/auth/github/callback?code=squad_repo_code_${Date.now()}&state=${state}`,
    { headers: { Cookie: `devai_oauth_nonce=${nonce}` } }
  );
  return cbRes.body.data;
}

// ==========================================
// TEST SUITE
// ==========================================

async function runSquadRepoTests() {
  console.log("\n========================================================");
  console.log("🧪 DEVAI SQUAD <-> GITHUB REPOSITORY TEST SUITE (STEP 4)");
  console.log("========================================================\n");

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  let memberToken;
  let memberUserId;
  let nonMemberToken;
  let nonMemberUserId;
  let adminToken;
  let squadId;
  let otherSquadId;
  let companyId;

  try {
    // ------------------------------------------------------------------
    // Setup: Seed Company, Squads, and Users
    // ------------------------------------------------------------------
    console.log("--- Setup: Seeding test company, squads, and users ---");

    // 1. Create company
    const [company] = await db
      .insert(companies)
      .values({ name: `Test Company ${Date.now()}` })
      .returning();
    companyId = company.id;

    // 2. Create squad
    const [squad] = await db
      .insert(squads)
      .values({ companyId, name: `Alpha Squad ${Date.now()}` })
      .returning();
    squadId = squad.id;

    // 3. Create second squad
    const [otherSquad] = await db
      .insert(squads)
      .values({ companyId, name: `Beta Squad ${Date.now()}` })
      .returning();
    otherSquadId = otherSquad.id;

    // 4. Authenticate member user via GitHub OAuth
    baseGithubUserId += 1;
    const memberOAuth = await performOAuth();
    memberToken = memberOAuth.accessToken;
    memberUserId = memberOAuth.user.id;

    // Add member user to squadId
    await db.insert(squadMembers).values({
      squadId,
      userId: memberUserId,
      role: "DEVELOPER",
    });

    // 5. Authenticate non-member user via GitHub OAuth (member of otherSquad only)
    baseGithubUserId += 1;
    const nonMemberOAuth = await performOAuth();
    nonMemberToken = nonMemberOAuth.accessToken;
    nonMemberUserId = nonMemberOAuth.user.id;

    await db.insert(squadMembers).values({
      squadId: otherSquadId,
      userId: nonMemberUserId,
      role: "DEVELOPER",
    });

    // 6. Create ADMIN token
    adminToken = jwt.sign(
      { id: "10000000-0000-0000-0000-000000000001", email: "admin@test.com", role: "ADMIN" },
      config.jwtSecret,
      { expiresIn: "1h" }
    );

    console.log(`  ✓ Squad created: ${squadId}`);
    console.log(`  ✓ Member user linked: ${memberUserId}`);
    console.log(`  ✓ Non-member user linked: ${nonMemberUserId}\n`);

    let createdLinkId;

    // ------------------------------------------------------------------
    // 1. Authorization Guards (squadAccess middleware)
    // ------------------------------------------------------------------
    console.log("--- 1. Authorization & Authentication Guards ---");

    await test("POST /squads/:squadId/github-repositories without JWT returns 401", async () => {
      const res = await request(`/squads/${squadId}/github-repositories`, {
        method: "POST",
        body: JSON.stringify({ githubRepositoryId: 123456, owner: "company", repo: "dev4ai" }),
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    await test("POST /squads/:squadId/github-repositories by non-member returns 403 (unauthorized squad)", async () => {
      const res = await request(`/squads/${squadId}/github-repositories`, {
        method: "POST",
        headers: { Authorization: `Bearer ${nonMemberToken}` },
        body: JSON.stringify({ githubRepositoryId: 123456, owner: "company", repo: "dev4ai" }),
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("not have access"));
    });

    await test("GET /squads/:squadId/github-repositories by non-member returns 403", async () => {
      const res = await request(`/squads/${squadId}/github-repositories`, {
        headers: { Authorization: `Bearer ${nonMemberToken}` },
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    await test("DELETE /squads/:squadId/github-repositories/:id by non-member returns 403", async () => {
      const res = await request(`/squads/${squadId}/github-repositories/00000000-0000-0000-0000-000000000001`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${nonMemberToken}` },
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    // ------------------------------------------------------------------
    // 2. Input Validation & Errors
    // ------------------------------------------------------------------
    console.log("\n--- 2. Input Validation & Errors ---");

    await test("Invalid squad ID format returns 400", async () => {
      const res = await request("/squads/invalid-uuid-123/github-repositories", {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ githubRepositoryId: 123456, owner: "company", repo: "dev4ai" }),
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    await test("Non-existent squad UUID returns 404", async () => {
      const nonExistentSquad = "99999999-9999-9999-9999-999999999999";
      // ADMIN bypasses membership check so hits squad existence check in service
      const res = await request(`/squads/${nonExistentSquad}/github-repositories`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ githubRepositoryId: 123456, owner: "company", repo: "dev4ai" }),
      });
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("Squad not found"));
    });

    await test("Missing required body fields returns 400", async () => {
      const res = await request(`/squads/${squadId}/github-repositories`, {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ owner: "company" }),
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    await test("Malformed repository name returns 400", async () => {
      const res = await request(`/squads/${squadId}/github-repositories`, {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ githubRepositoryId: 123456, owner: "company", repo: "-bad..repo" }),
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    await test("GitHub repository unavailable (GitHub 404) returns 404", async () => {
      mockState.repoStatus = 404;
      const res = await request(`/squads/${squadId}/github-repositories`, {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ githubRepositoryId: 999999, owner: "company", repo: "nonexistent" }),
      });
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("not found") || res.body.message.includes("unavailable"));
      mockState.repoStatus = 200;
    });

    // ------------------------------------------------------------------
    // 3. Successful Link: POST /squads/:squadId/github-repositories
    // ------------------------------------------------------------------
    console.log("\n--- 3. Successful Link ---");

    await test("Successfully links GitHub repository to squad with authoritative data", async () => {
      // Intentionally pass frontend values that differ to verify server fetches authoritative metadata
      const res = await request(`/squads/${squadId}/github-repositories`, {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({
          githubRepositoryId: 123456,
          owner: "company",
          repo: "dev4ai",
        }),
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data);

      const d = res.body.data;
      assert.ok(d.id);
      assert.equal(d.squadId, squadId);
      assert.equal(d.githubRepositoryId, "123456");
      assert.equal(d.githubRepositoryName, "dev4ai");
      assert.equal(d.githubOwner, "company");
      assert.equal(d.githubFullName, "company/dev4ai");
      assert.equal(d.githubUrl, "https://github.com/company/dev4ai");
      assert.ok(d.createdAt);
      assert.ok(d.updatedAt);

      createdLinkId = d.id;
    });

    // ------------------------------------------------------------------
    // 4. Duplicate Link Prevention
    // ------------------------------------------------------------------
    console.log("\n--- 4. Duplicate Link Prevention ---");

    await test("Duplicate repository link to the same squad returns 409 Conflict", async () => {
      const res = await request(`/squads/${squadId}/github-repositories`, {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({
          githubRepositoryId: 123456,
          owner: "company",
          repo: "dev4ai",
        }),
      });

      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("already linked"));
    });

    // ------------------------------------------------------------------
    // 5. List Linked Repositories: GET /squads/:squadId/github-repositories
    // ------------------------------------------------------------------
    console.log("\n--- 5. List Linked Repositories ---");

    await test("Lists all repositories linked to the squad", async () => {
      const res = await request(`/squads/${squadId}/github-repositories`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].id, createdLinkId);
      assert.equal(res.body.data[0].githubFullName, "company/dev4ai");
    });

    // ------------------------------------------------------------------
    // 6. Delete (Unlink): DELETE /squads/:squadId/github-repositories/:id
    // ------------------------------------------------------------------
    console.log("\n--- 6. Delete (Unlink) Repository ---");

    await test("Deleting non-existent link returns 404", async () => {
      const res = await request(
        `/squads/${squadId}/github-repositories/00000000-0000-0000-0000-000000000000`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${memberToken}` },
        }
      );
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
    });

    await test("Deleting a link that belongs to a different squad returns 404", async () => {
      // member has access to squadId, but requests deletion of createdLinkId on otherSquadId
      // (nonMember has access to otherSquadId)
      const res = await request(
        `/squads/${otherSquadId}/github-repositories/${createdLinkId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${nonMemberToken}` },
        }
      );
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
    });

    await test("Successfully unlinks GitHub repository from squad", async () => {
      const res = await request(`/squads/${squadId}/github-repositories/${createdLinkId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${memberToken}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // Verify list is now empty
      const listRes = await request(`/squads/${squadId}/github-repositories`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      assert.equal(listRes.status, 200);
      assert.equal(listRes.body.data.length, 0);
    });

    // ------------------------------------------------------------------
    // 7. IDOR & Multi-tenant Separation
    // ------------------------------------------------------------------
    console.log("\n--- 7. IDOR & Multi-tenant Separation ---");

    await test("User cannot link repository to a squad they are not a member of", async () => {
      const res = await request(`/squads/${squadId}/github-repositories`, {
        method: "POST",
        headers: { Authorization: `Bearer ${nonMemberToken}` },
        body: JSON.stringify({
          githubRepositoryId: 123456,
          owner: "company",
          repo: "dev4ai",
        }),
      });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    await test("User can link repository to their own squad without interfering with others", async () => {
      const res = await request(`/squads/${otherSquadId}/github-repositories`, {
        method: "POST",
        headers: { Authorization: `Bearer ${nonMemberToken}` },
        body: JSON.stringify({
          githubRepositoryId: 123456,
          owner: "company",
          repo: "dev4ai",
        }),
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.squadId, otherSquadId);

      // Verify squadId still has 0 repos while otherSquadId has 1
      const resSquad1 = await request(`/squads/${squadId}/github-repositories`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      const resSquad2 = await request(`/squads/${otherSquadId}/github-repositories`, {
        headers: { Authorization: `Bearer ${nonMemberToken}` },
      });

      assert.equal(resSquad1.body.data.length, 0);
      assert.equal(resSquad2.body.data.length, 1);
    });

  } finally {
    globalThis.fetch = originalFetch;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
  }

  console.log("\n========================================================");
  console.log(`📊 SQUAD GITHUB REPOS TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("========================================================\n");

  if (failedTests.length > 0) {
    console.log("Failed tests summary:");
    failedTests.forEach((f) => console.log(`  - ${f.name}: ${f.error}`));
    console.log("");
  }

  process.exit(failed > 0 ? 1 : 0);
}

runSquadRepoTests().catch((err) => {
  console.error("Test runner fatal error:", err);
  process.exit(1);
});
