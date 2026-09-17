/**
 * github-connection.test.js
 *
 * Tests for the GitHub Integration Connection Layer:
 *   GET  /github/connection
 *   DELETE /github/connection
 *
 * Follows the same pattern as github-oauth.test.js:
 *   - In-process HTTP server on a random port
 *   - Mocked globalThis.fetch for GitHub API calls
 *   - Real PostgreSQL database (same test DB)
 *   - Real encryption / decryption via tokenEncryption.js
 */

import dotenv from "dotenv";
dotenv.config();

process.env.NODE_ENV = "test";
process.env.GITHUB_CLIENT_ID = "test_github_client_id";
process.env.GITHUB_CLIENT_SECRET = "test_github_client_secret_xyz123";
process.env.GITHUB_CALLBACK_URL = "http://127.0.0.1:3000/auth/github/callback";

// Use a deterministic 32-byte key for testing
process.env.GITHUB_TOKEN_ENCRYPTION_KEY =
  "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20";

import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";
import { pool, db } from "../src/db/index.js";
import { users } from "../src/db/schema/users.schema.js";
import { userAuthAccounts } from "../src/db/schema/userAuthAccounts.schema.js";
import { githubConnections } from "../src/db/schema/githubConnections.schema.js";
import { eq, and } from "drizzle-orm";
import jwt from "jsonwebtoken";
import config from "../src/config/index.js";
import { encrypt, decrypt } from "../src/shared/utils/tokenEncryption.js";
import githubTokenService from "../src/modules/github/services/githubToken.service.js";

// Ensure config has test values
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
let lastCapturedHeaders = {};
let mockGithubConfig = {
  tokenResponse: {
    access_token: "mock_gh_access_token_conn_test_abc123",
    token_type: "bearer",
    scope: "read:user user:email read:org repo",
  },
  tokenStatus: 200,
  refreshResponse: null,
  refreshStatus: 200,
  userResponse: {
    id: 55667788,
    login: "conn_test_user",
    name: "Connection Test User",
    avatar_url: "https://avatars.github.com/u/55667788",
  },
  userStatus: 200,
  emailsResponse: [
    { email: "conn_test@example.com", primary: true, verified: true },
  ],
  emailsStatus: 200,
  userReposResponse: [
    {
      id: 991,
      name: "refreshed-repo",
      full_name: "conn_test_user/refreshed-repo",
      owner: { login: "conn_test_user" },
      private: false,
      default_branch: "main",
      html_url: "https://github.com/conn_test_user/refreshed-repo",
    },
  ],
  userOrgsResponse: [
    {
      id: 881,
      login: "refreshed-org",
      avatar_url: "https://avatars.github.com/u/881",
      description: "Refreshed Org",
    },
  ],
};

globalThis.fetch = async (url, options = {}) => {
  const urlString = String(url);

  if (urlString.includes("github.com/login/oauth/access_token")) {
    if (options.body && typeof options.body === "string" && options.body.includes("refresh_token")) {
      if (mockGithubConfig.refreshStatus && mockGithubConfig.refreshStatus !== 200) {
        return new Response(JSON.stringify(mockGithubConfig.refreshResponse || { error: "bad_refresh_token" }), {
          status: mockGithubConfig.refreshStatus,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (mockGithubConfig.refreshResponse) {
        return new Response(JSON.stringify(mockGithubConfig.refreshResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    return new Response(JSON.stringify(mockGithubConfig.tokenResponse), {
      status: mockGithubConfig.tokenStatus,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (urlString.endsWith("api.github.com/user")) {
    return new Response(JSON.stringify(mockGithubConfig.userResponse), {
      status: mockGithubConfig.userStatus,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (urlString.includes("api.github.com/user/emails")) {
    return new Response(JSON.stringify(mockGithubConfig.emailsResponse), {
      status: mockGithubConfig.emailsStatus,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (urlString.includes("api.github.com/user/repos")) {
    lastCapturedHeaders["/user/repos"] = options.headers;
    return new Response(JSON.stringify(mockGithubConfig.userReposResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (urlString.includes("api.github.com/user/orgs")) {
    lastCapturedHeaders["/user/orgs"] = options.headers;
    return new Response(JSON.stringify(mockGithubConfig.userOrgsResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // GitHub token revocation endpoint — return 204 No Content
  if (urlString.includes("api.github.com/applications") && urlString.includes("/token")) {
    if (options.method === "DELETE") {
      return new Response(null, { status: 204 });
    }
  }

  return originalFetch(url, options);
};

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const res = await originalFetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    redirect: options.redirect || "manual",
  });

  let data = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    headers: res.headers,
    body: data,
  };
}

// ==========================================
// HELPERS
// ==========================================

/**
 * Generates a DEVAI access token directly (bypass full OAuth flow for isolation).
 */
function generateTestAccessToken(userId, email) {
  return jwt.sign(
    { id: userId, email, role: "MEMBER" },
    config.jwtSecret,
    { expiresIn: "15m" }
  );
}

/**
 * Performs the GitHub OAuth callback to create a fully-linked user+connection.
 * Returns { accessToken, user }.
 */
async function performGithubOAuth(stateToken, nonce) {
  const res = await request(
    `/auth/github/callback?code=valid_code_conn&state=${stateToken}`,
    { headers: { Cookie: `devai_oauth_nonce=${nonce}` } }
  );
  return res.body.data;
}

async function runGithubConnectionTests() {
  console.log("\n========================================================");
  console.log("🔗 DEVAI - GITHUB CONNECTION API TEST SUITE");
  console.log("========================================================\n");

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`Test server running on ${baseUrl}\n`);
      resolve();
    });
  });

  try {
    // ========================================================
    // SETUP: Get a valid OAuth state token for callback tests
    // ========================================================

    const initRes = await request("/auth/github", {
      headers: { Accept: "application/json" },
    });
    const { state: validStateToken } = initRes.body.data;

    // Extract nonce from the decoded state JWT
    const decodedState = jwt.verify(validStateToken, config.jwtSecret);
    const validCookieNonce = decodedState.nonce;

    // ========================================================
    // SECTION 1: ENCRYPTION UNIT TESTS
    // ========================================================
    console.log("--- 1. Token Encryption Unit Tests ---");

    await test("encrypt() produces a non-empty colon-delimited string (iv:authTag:ciphertext)", () => {
      const payload = "ghp_test_access_token_abc123xyz";
      const encrypted = encrypt(payload);
      assert.ok(encrypted, "encrypt() returned empty string");
      const parts = encrypted.split(":");
      assert.equal(parts.length, 3, `Expected 3 parts, got ${parts.length}`);
      assert.ok(parts[0].length > 0, "IV part is empty");
      assert.ok(parts[1].length > 0, "Auth tag part is empty");
      assert.ok(parts[2].length > 0, "Ciphertext part is empty");
    });

    await test("decrypt(encrypt(token)) round-trips correctly", () => {
      const original = "ghp_super_secret_token_xyz789";
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      assert.equal(decrypted, original);
    });

    await test("encrypt() produces different ciphertext for the same input (random IV)", () => {
      const token = "ghp_same_token_input";
      const enc1 = encrypt(token);
      const enc2 = encrypt(token);
      assert.notEqual(enc1, enc2, "Two encryptions of the same value should differ (random IV)");
      // But both must decrypt to the same value
      assert.equal(decrypt(enc1), token);
      assert.equal(decrypt(enc2), token);
    });

    await test("decrypt() throws on tampered ciphertext (GCM auth tag failure)", () => {
      const encrypted = encrypt("ghp_tamper_me");
      const parts = encrypted.split(":");
      // Corrupt the ciphertext portion
      const corrupted = parts[0] + ":" + parts[1] + ":AAAAAAAAAAAAAAAA";
      assert.throws(() => decrypt(corrupted), /decryption failed/i);
    });

    // ========================================================
    // SECTION 2: UNAUTHENTICATED ACCESS
    // ========================================================
    console.log("\n--- 2. Unauthenticated Access ---");

    await test("GET /github/connection returns 401 without Authorization header", async () => {
      const res = await request("/github/connection");
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    await test("DELETE /github/connection returns 401 without Authorization header", async () => {
      const res = await request("/github/connection", { method: "DELETE" });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    await test("GET /github/connection returns 401 with invalid/expired JWT", async () => {
      const res = await request("/github/connection", {
        headers: { Authorization: "Bearer invalid.jwt.token" },
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    // ========================================================
    // SECTION 3: NO CONNECTION STATE
    // ========================================================
    console.log("\n--- 3. No GitHub Connection ---");

    // Create a bare user (no GitHub link)
    const bareUserEmail = `bare_user_${Date.now()}@example.com`;
    const registerRes = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Bare User",
        email: bareUserEmail,
        password: "Password@123",
      }),
    });
    assert.equal(registerRes.status, 201);
    const bareUserId = registerRes.body.data.id;
    const bareUserToken = generateTestAccessToken(bareUserId, bareUserEmail);

    await test("GET /github/connection returns { connected: false } for user with no GitHub link", async () => {
      const res = await request("/github/connection", {
        headers: { Authorization: `Bearer ${bareUserToken}` },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.connected, false);
      assert.equal(res.body.data.github, undefined);
    });

    await test("DELETE /github/connection returns 404 for user with no GitHub link", async () => {
      const res = await request("/github/connection", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${bareUserToken}` },
      });
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
    });

    // ========================================================
    // SECTION 4: SUCCESSFUL GITHUB CONNECTION
    // ========================================================
    console.log("\n--- 4. Successful GitHub Connection ---");

    const uniqueGithubId = Date.now() + 100;
    const connectedEmail = `connected_${uniqueGithubId}@example.com`;

    mockGithubConfig.userResponse = {
      id: uniqueGithubId,
      login: `conn_octo_${uniqueGithubId}`,
      name: "Connected Octo",
      avatar_url: `https://avatars.github.com/u/${uniqueGithubId}`,
    };
    mockGithubConfig.emailsResponse = [
      { email: connectedEmail, primary: true, verified: true },
    ];

    const authData = await performGithubOAuth(validStateToken, validCookieNonce);
    const connectedUserId = authData.user.id;
    const connectedUserToken = authData.accessToken;

    await test("GET /github/connection returns { connected: true, github: { id, username, avatarUrl } } after OAuth", async () => {
      const res = await request("/github/connection", {
        headers: { Authorization: `Bearer ${connectedUserToken}` },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.connected, true);
      assert.ok(res.body.data.github);
      assert.equal(res.body.data.github.id, String(uniqueGithubId));
      assert.equal(res.body.data.github.username, `conn_octo_${uniqueGithubId}`);
      assert.ok(res.body.data.github.avatarUrl.includes(String(uniqueGithubId)));
    });

    await test("Response NEVER contains accessToken, refreshToken, or clientSecret", async () => {
      const res = await request("/github/connection", {
        headers: { Authorization: `Bearer ${connectedUserToken}` },
      });
      const jsonStr = JSON.stringify(res.body);
      assert.ok(!jsonStr.includes("accessToken"), "accessToken must not appear in response");
      assert.ok(!jsonStr.includes("refreshToken"), "refreshToken must not appear in response");
      assert.ok(!jsonStr.includes("clientSecret"), "clientSecret must not appear in response");
      assert.ok(!jsonStr.includes("mock_gh_access_token"), "Raw GitHub token must not appear");
      assert.ok(!jsonStr.includes("test_github_client_secret"), "Client secret must not appear");
      assert.ok(!jsonStr.includes("access_token_encrypted"), "Encrypted token field must not appear");
    });

    // ========================================================
    // SECTION 5: TOKEN ENCRYPTION IN DATABASE
    // ========================================================
    console.log("\n--- 5. Token Encryption in Database ---");

    await test("Database stores ENCRYPTED token, not the plaintext GitHub token", async () => {
      const [record] = await db
        .select()
        .from(githubConnections)
        .where(eq(githubConnections.userId, connectedUserId));

      assert.ok(record, "github_connections record not found");
      assert.ok(
        record.accessTokenEncrypted,
        "accessTokenEncrypted column is empty"
      );
      // Must NOT be the raw token
      assert.notEqual(
        record.accessTokenEncrypted,
        "mock_gh_access_token_conn_test_abc123",
        "Token is stored in plaintext — SECURITY FAILURE"
      );
      // Must be the iv:authTag:ciphertext format
      const parts = record.accessTokenEncrypted.split(":");
      assert.equal(parts.length, 3, "Stored token is not in iv:authTag:ciphertext format");
    });

    await test("Stored encrypted token can be decrypted back to the original GitHub token", async () => {
      const [record] = await db
        .select()
        .from(githubConnections)
        .where(eq(githubConnections.userId, connectedUserId));

      assert.ok(record);
      const decrypted = decrypt(record.accessTokenEncrypted);
      assert.equal(
        decrypted,
        "mock_gh_access_token_conn_test_abc123",
        "Decrypted token does not match original"
      );
    });

    await test("github_connections stores correct userId and githubUserId", async () => {
      const [record] = await db
        .select()
        .from(githubConnections)
        .where(eq(githubConnections.userId, connectedUserId));

      assert.ok(record);
      assert.equal(record.userId, connectedUserId);
      assert.equal(record.githubUserId, String(uniqueGithubId));
      assert.equal(record.githubUsername, `conn_octo_${uniqueGithubId}`);
    });

    // ========================================================
    // SECTION 6: IDOR PREVENTION
    // ========================================================
    console.log("\n--- 6. IDOR Prevention ---");

    await test("User cannot see another user's GitHub connection (only sees own or not-connected)", async () => {
      // bareUser has no connection, so asking for /github/connection with their token
      // should return { connected: false } — not connectedUser's data
      const res = await request("/github/connection", {
        headers: { Authorization: `Bearer ${bareUserToken}` },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.connected, false);
      // Ensure connectedUser's github info is NOT in the response
      const jsonStr = JSON.stringify(res.body);
      assert.ok(
        !jsonStr.includes(`conn_octo_${uniqueGithubId}`),
        "Another user's GitHub username leaked in response"
      );
    });

    // ========================================================
    // SECTION 7: DELETE CONNECTION
    // ========================================================
    console.log("\n--- 7. Delete GitHub Connection ---");

    await test("DELETE /github/connection returns 200 and removes the connection", async () => {
      const res = await request("/github/connection", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${connectedUserToken}` },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });

    await test("GET /github/connection returns { connected: false } after deletion", async () => {
      const res = await request("/github/connection", {
        headers: { Authorization: `Bearer ${connectedUserToken}` },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.connected, false);
    });

    await test("github_connections record is removed from database after deletion", async () => {
      const records = await db
        .select()
        .from(githubConnections)
        .where(eq(githubConnections.userId, connectedUserId));

      assert.equal(records.length, 0, "github_connections record should be deleted");
    });

    await test("DEVAI user account is NOT deleted after GitHub connection removal", async () => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, connectedUserId));

      assert.ok(user, "DEVAI user should still exist after GitHub connection removal");
      assert.equal(user.email, connectedEmail);
    });

    await test("user_auth_accounts record is NOT deleted after GitHub connection removal", async () => {
      const accounts = await db
        .select()
        .from(userAuthAccounts)
        .where(eq(userAuthAccounts.userId, connectedUserId));

      assert.ok(accounts.length > 0, "user_auth_accounts record should still exist");
    });

    await test("DELETE /github/connection returns 404 when called twice (idempotency guard)", async () => {
      const res = await request("/github/connection", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${connectedUserToken}` },
      });
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
    });

    // ========================================================
    // SECTION 8: UPSERT — RE-AUTHENTICATING REFRESHES TOKEN
    // ========================================================
    console.log("\n--- 8. OAuth Re-authentication Refreshes Connection ---");

    const secondGithubToken = "mock_gh_access_token_second_refresh_xyz";
    mockGithubConfig.tokenResponse = {
      access_token: secondGithubToken,
      token_type: "bearer",
      scope: "read:user user:email repo",
    };
    // Same GitHub user, same email — second OAuth will upsert
    mockGithubConfig.userResponse = {
      id: uniqueGithubId,
      login: `conn_octo_${uniqueGithubId}`,
      name: "Connected Octo",
      avatar_url: `https://avatars.github.com/u/${uniqueGithubId}`,
    };
    mockGithubConfig.emailsResponse = [
      { email: connectedEmail, primary: true, verified: true },
    ];

    await test("Re-authenticating with GitHub upserts github_connections with new token", async () => {
      // Re-do OAuth for same user
      const secondInitRes = await request("/auth/github", {
        headers: { Accept: "application/json" },
      });
      const secondState = secondInitRes.body.data.state;
      const secondDecoded = jwt.verify(secondState, config.jwtSecret);
      const secondNonce = secondDecoded.nonce;

      await performGithubOAuth(secondState, secondNonce);

      // Verify new token is stored
      const [record] = await db
        .select()
        .from(githubConnections)
        .where(eq(githubConnections.userId, connectedUserId));

      assert.ok(record, "github_connections record not found after re-auth");
      const decrypted = decrypt(record.accessTokenEncrypted);
      assert.equal(decrypted, secondGithubToken, "New token was not stored after re-auth");
    });

    // Restore token config
    mockGithubConfig.tokenResponse = {
      access_token: "mock_gh_access_token_conn_test_abc123",
      token_type: "bearer",
      scope: "read:user user:email",
    };

    // ========================================================
    // SECTION 9: EXISTING AUTH STILL WORKS
    // ========================================================
    console.log("\n--- 9. Existing Auth Routes Unaffected ---");

    const legacyEmail = `legacy_${Date.now()}@example.com`;
    await test("POST /auth/register still works", async () => {
      const res = await request("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Legacy User",
          email: legacyEmail,
          password: "Password@123",
        }),
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.id);
    });

    await test("POST /auth/login still works", async () => {
      const res = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: legacyEmail,
          password: "Password@123",
        }),
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.accessToken);
    });

    await test("GET /auth/github still redirects to GitHub", async () => {
      const res = await request("/auth/github");
      assert.equal(res.status, 302);
      const location = res.headers.get("location");
      assert.ok(location?.startsWith("https://github.com/login/oauth/authorize"));
    });

    await test("Existing GitHub OAuth callback still creates user and returns DEVAI tokens", async () => {
      const newGithubId = Date.now() + 9999;
      const newEmail = `oauth_regression_${newGithubId}@example.com`;

      mockGithubConfig.userResponse = {
        id: newGithubId,
        login: `regression_octo_${newGithubId}`,
        name: "Regression User",
        avatar_url: `https://avatars.github.com/u/${newGithubId}`,
      };
      mockGithubConfig.emailsResponse = [
        { email: newEmail, primary: true, verified: true },
      ];

      const initR = await request("/auth/github", { headers: { Accept: "application/json" } });
      const stateR = initR.body.data.state;
      const decodedR = jwt.verify(stateR, config.jwtSecret);

      const authRes = await performGithubOAuth(stateR, decodedR.nonce);
      assert.ok(authRes.accessToken, "accessToken missing from OAuth response");
      assert.ok(authRes.refreshToken, "refreshToken missing from OAuth response");
      assert.ok(authRes.user.id, "user.id missing from OAuth response");
      assert.equal(authRes.user.email, newEmail);

      // GitHub access token must NOT be in the response
      const jsonStr = JSON.stringify(authRes);
      assert.ok(!jsonStr.includes("mock_gh_access_token"), "GitHub access token leaked in response");
    });

    // ========================================================
    // SECTION 10: GITHUB TOKEN SERVICE & AUTOMATIC REFRESH
    // ========================================================
    console.log("\n--- 10. Dedicated GitHub Token Service & Token Refresh ---");

    // Create a fresh test user with GitHub connection for token refresh tests
    const refreshTestGithubId = Date.now() + 8888;
    const refreshUserEmail = `token_refresh_${refreshTestGithubId}@example.com`;

    mockGithubConfig.userResponse = {
      id: refreshTestGithubId,
      login: `refresh_octo_${refreshTestGithubId}`,
      name: "Refresh Octo",
      avatar_url: `https://avatars.github.com/u/${refreshTestGithubId}`,
    };
    mockGithubConfig.emailsResponse = [
      { email: refreshUserEmail, primary: true, verified: true },
    ];

    const initRefreshOAuth = await request("/auth/github", { headers: { Accept: "application/json" } });
    const refreshState = initRefreshOAuth.body.data.state;
    const refreshDecoded = jwt.verify(refreshState, config.jwtSecret);
    const refreshAuthRes = await performGithubOAuth(refreshState, refreshDecoded.nonce);
    const refreshUserId = refreshAuthRes.user.id;
    const refreshUserJwt = refreshAuthRes.accessToken;

    await test("getValidAccessToken returns decrypted access token directly when token has no expiry (classic token)", async () => {
      const token = await githubTokenService.getValidAccessToken(refreshUserId);
      assert.equal(token, "mock_gh_access_token_conn_test_abc123");
    });

    await test("getValidAccessToken returns decrypted token directly when token expires far in future (> 60s)", async () => {
      // Set expiration to 1 hour in the future
      const futureExpiry = new Date(Date.now() + 3600 * 1000);
      await db
        .update(githubConnections)
        .set({ accessTokenExpiresAt: futureExpiry })
        .where(eq(githubConnections.userId, refreshUserId));

      const token = await githubTokenService.getValidAccessToken(refreshUserId);
      assert.equal(token, "mock_gh_access_token_conn_test_abc123");
    });

    await test("getValidAccessToken automatically refreshes token when expired, rotating refresh token and updating DB", async () => {
      // Set token as expired (10 seconds ago) and provide an encrypted refresh token
      const expiredAt = new Date(Date.now() - 10 * 1000);
      const initialRefreshToken = "ghr_initial_refresh_token_test_123";
      await db
        .update(githubConnections)
        .set({
          accessTokenExpiresAt: expiredAt,
          refreshTokenEncrypted: encrypt(initialRefreshToken),
        })
        .where(eq(githubConnections.userId, refreshUserId));

      const newAccessTokenFromGithub = "ghu_refreshed_access_token_xyz999";
      const rotatedRefreshTokenFromGithub = "ghr_rotated_refresh_token_xyz888";

      mockGithubConfig.refreshResponse = {
        access_token: newAccessTokenFromGithub,
        expires_in: 7200,
        refresh_token: rotatedRefreshTokenFromGithub,
        refresh_token_expires_in: 14400,
        scope: "read:user user:email read:org repo",
        token_type: "bearer",
      };

      const refreshedToken = await githubTokenService.getValidAccessToken(refreshUserId);
      assert.equal(refreshedToken, newAccessTokenFromGithub);

      // Verify database record was updated with encrypted tokens
      const [updatedRecord] = await db
        .select()
        .from(githubConnections)
        .where(eq(githubConnections.userId, refreshUserId));

      assert.ok(updatedRecord);
      // Stored token is encrypted
      assert.notEqual(updatedRecord.accessTokenEncrypted, newAccessTokenFromGithub);
      assert.equal(decrypt(updatedRecord.accessTokenEncrypted), newAccessTokenFromGithub);
      // Rotated refresh token is encrypted
      assert.notEqual(updatedRecord.refreshTokenEncrypted, rotatedRefreshTokenFromGithub);
      assert.equal(decrypt(updatedRecord.refreshTokenEncrypted), rotatedRefreshTokenFromGithub);
      // Expiration timestamps updated
      assert.ok(updatedRecord.accessTokenExpiresAt);
      assert.ok(new Date(updatedRecord.accessTokenExpiresAt).getTime() > Date.now());
      assert.ok(updatedRecord.refreshTokenExpiresAt);
      // Scopes updated
      assert.equal(updatedRecord.scopes, "read:user user:email read:org repo");
    });

    await test("Failed refresh (invalid/expired refresh token) deletes connection and returns 401 error", async () => {
      // Set token as expired
      const expiredAt = new Date(Date.now() - 10 * 1000);
      await db
        .update(githubConnections)
        .set({
          accessTokenExpiresAt: expiredAt,
          refreshTokenEncrypted: encrypt("ghr_bad_refresh_token"),
        })
        .where(eq(githubConnections.userId, refreshUserId));

      mockGithubConfig.refreshStatus = 400;
      mockGithubConfig.refreshResponse = {
        error: "bad_refresh_token",
        error_description: "The refresh token is invalid or has expired.",
      };

      await assert.rejects(
        async () => {
          await githubTokenService.getValidAccessToken(refreshUserId);
        },
        (err) => {
          assert.equal(err.statusCode, 401);
          assert.ok(err.message.includes("expired or been revoked"));
          return true;
        }
      );

      // Connection should be deleted
      const [record] = await db
        .select()
        .from(githubConnections)
        .where(eq(githubConnections.userId, refreshUserId));
      assert.equal(record, undefined);

      // Reset mock
      mockGithubConfig.refreshStatus = 200;
      mockGithubConfig.refreshResponse = null;
    });

    await test("Repository API (GET /github/repositories) succeeds using refreshed token when current token expired", async () => {
      // Re-create connection with expiring token
      const repoTestToken = "ghu_repo_refreshed_access_token_111";
      const initialToken = "ghu_expired_repo_token";
      const now = new Date();
      const expiredAt = new Date(Date.now() - 5000);

      await db.insert(githubConnections).values({
        userId: refreshUserId,
        githubUserId: String(refreshTestGithubId),
        githubUsername: `refresh_octo_${refreshTestGithubId}`,
        accessTokenEncrypted: encrypt(initialToken),
        refreshTokenEncrypted: encrypt("ghr_repo_refresh_token"),
        accessTokenExpiresAt: expiredAt,
        scopes: "read:user user:email repo",
        createdAt: now,
        updatedAt: now,
      });

      mockGithubConfig.refreshStatus = 200;
      mockGithubConfig.refreshResponse = {
        access_token: repoTestToken,
        expires_in: 3600,
        scope: "read:user user:email read:org repo",
        token_type: "bearer",
      };

      const res = await request("/github/repositories", {
        headers: { Authorization: `Bearer ${refreshUserJwt}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      // Verify GitHub API was called with the REFRESHED access token
      assert.equal(
        lastCapturedHeaders["/user/repos"]?.Authorization || lastCapturedHeaders["/user/repos"]?.authorization,
        `Bearer ${repoTestToken}`
      );
    });

    await test("Organization API (GET /github/organizations) succeeds using refreshed token when current token expired", async () => {
      // Expire the token again
      const orgTestToken = "ghu_org_refreshed_access_token_222";
      const expiredAt = new Date(Date.now() - 5000);

      await db
        .update(githubConnections)
        .set({
          accessTokenExpiresAt: expiredAt,
          refreshTokenEncrypted: encrypt("ghr_org_refresh_token"),
        })
        .where(eq(githubConnections.userId, refreshUserId));

      mockGithubConfig.refreshStatus = 200;
      mockGithubConfig.refreshResponse = {
        access_token: orgTestToken,
        expires_in: 3600,
        scope: "read:user user:email read:org repo",
        token_type: "bearer",
      };

      const res = await request("/github/organizations", {
        headers: { Authorization: `Bearer ${refreshUserJwt}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      // Verify GitHub API was called with the REFRESHED access token
      assert.equal(
        lastCapturedHeaders["/user/orgs"]?.Authorization || lastCapturedHeaders["/user/orgs"]?.authorization,
        `Bearer ${orgTestToken}`
      );
    });

    await test("GET /github/connection returns safe metadata and never leaks tokens or client secrets", async () => {
      const res = await request("/github/connection", {
        headers: { Authorization: `Bearer ${refreshUserJwt}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.connected, true);
      assert.equal(res.body.data.github.id, String(refreshTestGithubId));
      assert.ok(res.body.data.github.username);
      assert.ok(res.body.data.github.avatarUrl);
      assert.ok("scopes" in res.body.data.github);
      assert.ok("tokenExpiresAt" in res.body.data.github);

      const jsonStr = JSON.stringify(res.body);
      assert.ok(!jsonStr.includes("accessToken\":"));
      assert.ok(!jsonStr.includes("refreshToken\":"));
      assert.ok(!jsonStr.includes("clientSecret"));
      assert.ok(!jsonStr.includes("accessTokenEncrypted"));
      assert.ok(!jsonStr.includes("refreshTokenEncrypted"));
      assert.ok(!jsonStr.includes("test_github_client_secret"));
      assert.ok(!jsonStr.includes("ghu_"));
      assert.ok(!jsonStr.includes("ghr_"));
    });

  } finally {
    globalThis.fetch = originalFetch;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
  }

  console.log("\n========================================================");
  console.log(
    `📊 GITHUB CONNECTION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`
  );
  console.log("========================================================\n");

  if (failedTests.length > 0) {
    console.log("Failed tests summary:");
    failedTests.forEach((f) => console.log(`  - ${f.name}: ${f.error}`));
    console.log("");
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runGithubConnectionTests().catch((err) => {
  console.error("Test suite encountered fatal error:", err);
  process.exit(1);
});
