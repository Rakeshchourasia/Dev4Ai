import dotenv from "dotenv";
dotenv.config();

process.env.NODE_ENV = "test";
process.env.GITHUB_CLIENT_ID = "test_github_client_id";
process.env.GITHUB_CLIENT_SECRET = "test_github_client_secret_xyz123";
process.env.GITHUB_CALLBACK_URL = "http://127.0.0.1:3000/auth/github/callback";

import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";
import { pool, db } from "../src/db/index.js";
import { users } from "../src/db/schema/users.schema.js";
import { userAuthAccounts } from "../src/db/schema/userAuthAccounts.schema.js";
import { githubConnections } from "../src/db/schema/githubConnections.schema.js";
import { activityLogs } from "../src/db/schema/activityLogs.schema.js";
import { eq, and } from "drizzle-orm";
import jwt from "jsonwebtoken";
import config from "../src/config/index.js";

// Ensure config has test values
config.githubClientId = process.env.GITHUB_CLIENT_ID;
config.githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
config.githubCallbackUrl = process.env.GITHUB_CALLBACK_URL;

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

// Mock GitHub API responses
const originalFetch = globalThis.fetch;
let mockGithubConfig = {
  tokenResponse: {
    access_token: "mock_gh_access_token_secret_123",
    token_type: "bearer",
    scope: "read:user user:email read:org repo",
  },
  tokenStatus: 200,
  userResponse: {
    id: 11223344,
    login: "octotest",
    name: "Octo Test User",
    avatar_url: "https://avatars.github.com/u/11223344",
  },
  userStatus: 200,
  emailsResponse: [
    { email: "octo_primary@example.com", primary: true, verified: true },
  ],
  emailsStatus: 200,
};

globalThis.fetch = async (url, options = {}) => {
  const urlString = String(url);

  // GitHub token exchange
  if (urlString.includes("github.com/login/oauth/access_token")) {
    return new Response(JSON.stringify(mockGithubConfig.tokenResponse), {
      status: mockGithubConfig.tokenStatus,
      headers: { "Content-Type": "application/json" },
    });
  }

  // GitHub user profile
  if (urlString.endsWith("api.github.com/user")) {
    return new Response(JSON.stringify(mockGithubConfig.userResponse), {
      status: mockGithubConfig.userStatus,
      headers: { "Content-Type": "application/json" },
    });
  }

  // GitHub user emails
  if (urlString.includes("api.github.com/user/emails")) {
    return new Response(JSON.stringify(mockGithubConfig.emailsResponse), {
      status: mockGithubConfig.emailsStatus,
      headers: { "Content-Type": "application/json" },
    });
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

async function runGithubOAuthTests() {
  console.log("\n========================================================");
  console.log("🐙 DEVAI - GITHUB OAUTH VERIFICATION SUITE");
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
    let validStateToken;
    let validCookieNonce;

    // ========================================================
    // 1. INITIATION & REDIRECT
    // ========================================================
    console.log("--- 1. OAuth Initiation (GET /auth/github) ---");

    await test("GET /auth/github redirects (302) to GitHub authorization URL with PKCE and state", async () => {
      const res = await request("/auth/github");
      assert.equal(res.status, 302);

      const location = res.headers.get("location");
      assert.ok(location);
      assert.ok(location.startsWith("https://github.com/login/oauth/authorize"));

      const url = new URL(location);
      assert.equal(url.searchParams.get("client_id"), "test_github_client_id");
      assert.equal(url.searchParams.get("redirect_uri"), "http://127.0.0.1:3000/auth/github/callback");
      assert.equal(url.searchParams.get("scope"), "read:user user:email read:org repo");
      assert.equal(url.searchParams.get("code_challenge_method"), "S256");
      assert.ok(url.searchParams.get("code_challenge"));
      assert.ok(url.searchParams.get("state"));

      validStateToken = url.searchParams.get("state");

      // Verify Set-Cookie header contains devai_oauth_nonce
      const setCookie = res.headers.get("set-cookie");
      assert.ok(setCookie);
      assert.ok(setCookie.includes("devai_oauth_nonce="));
      const match = setCookie.match(/devai_oauth_nonce=([^;]+)/);
      validCookieNonce = match ? match[1] : null;
      assert.ok(validCookieNonce);
    });

    await test("State parameter is a verifiable JWT containing codeVerifier and nonce", async () => {
      const decoded = jwt.verify(validStateToken, config.jwtSecret);
      assert.equal(decoded.type, "github_oauth_state");
      assert.equal(decoded.nonce, validCookieNonce);
      assert.ok(decoded.codeVerifier);
    });

    await test("GET /auth/github returns JSON when requested with Accept: application/json", async () => {
      const res = await request("/auth/github", {
        headers: { Accept: "application/json" },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.authUrl);
      assert.ok(res.body.data.state);
    });

    // ========================================================
    // 2. ERROR & VALIDATION HANDLING
    // ========================================================
    console.log("\n--- 2. Error & Security Validation ---");

    await test("Callback rejects access_denied from GitHub (400 Bad Request)", async () => {
      const res = await request("/auth/github/callback?error=access_denied&error_description=User+denied");
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("GitHub authorization denied"));
    });

    await test("Callback rejects missing code parameter (400 Bad Request)", async () => {
      const res = await request(`/auth/github/callback?state=${validStateToken}`);
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("code is missing"));
    });

    await test("Callback rejects missing state parameter (400 Bad Request)", async () => {
      const res = await request("/auth/github/callback?code=mock_code_123");
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("state parameter is missing"));
    });

    await test("Callback rejects invalid or tampered state token (400 Bad Request)", async () => {
      const res = await request("/auth/github/callback?code=mock_code_123&state=tampered_invalid_state");
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("Invalid or expired OAuth state"));
    });

    await test("Callback rejects expired state token (400 Bad Request)", async () => {
      const expiredState = jwt.sign(
        { nonce: "123", codeVerifier: "abc", type: "github_oauth_state" },
        config.jwtSecret,
        { expiresIn: "0s" }
      );
      const res = await request(`/auth/github/callback?code=mock_code_123&state=${expiredState}`);
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("Invalid or expired OAuth state"));
    });

    await test("Callback rejects missing nonce cookie (403 Forbidden)", async () => {
      const res = await request(`/auth/github/callback?code=mock_code_123&state=${validStateToken}`);
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("Missing nonce cookie"));
    });

    await test("Callback rejects state CSRF nonce mismatch (403 Forbidden)", async () => {
      const res = await request(`/auth/github/callback?code=mock_code_123&state=${validStateToken}`, {
        headers: { Cookie: "devai_oauth_nonce=attacker_nonce_mismatch" },
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("CSRF validation failed"));
    });

    await test("Callback handles GitHub token exchange failure (400 Bad Request)", async () => {
      mockGithubConfig.tokenResponse = {
        error: "bad_verification_code",
        error_description: "The code passed is incorrect or expired.",
      };

      const res = await request(
        `/auth/github/callback?code=invalid_code&state=${validStateToken}`,
        { headers: { Cookie: `devai_oauth_nonce=${validCookieNonce}` } }
      );
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("The code passed is incorrect or expired"));

      // Restore mock
      mockGithubConfig.tokenResponse = {
        access_token: "mock_gh_access_token_secret_123",
        token_type: "bearer",
        scope: "read:user user:email read:org repo",
      };
    });

    await test("Callback handles GitHub user API failure (502 Bad Gateway)", async () => {
      mockGithubConfig.userStatus = 500;

      const res = await request(
        `/auth/github/callback?code=mock_code_123&state=${validStateToken}`,
        { headers: { Cookie: `devai_oauth_nonce=${validCookieNonce}` } }
      );
      assert.equal(res.status, 502);
      assert.equal(res.body.success, false);

      // Restore mock
      mockGithubConfig.userStatus = 200;
    });

    await test("Callback rejects account when GitHub returns no verified email even if profile has email (400 Bad Request)", async () => {
      mockGithubConfig.emailsResponse = [
        { email: "unverified@example.com", primary: true, verified: false },
      ];
      // Profile email is set, but MUST NOT be used as an unverified fallback
      mockGithubConfig.userResponse.email = "unverified_profile_fallback@example.com";

      const res = await request(
        `/auth/github/callback?code=mock_code_123&state=${validStateToken}`,
        { headers: { Cookie: `devai_oauth_nonce=${validCookieNonce}` } }
      );
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("verified email"));

      // Restore mock
      mockGithubConfig.emailsResponse = [
        { email: "octo_primary@example.com", primary: true, verified: true },
      ];
      mockGithubConfig.userResponse.email = null;
    });

    await test("Callback accepts secondary email when primary is unverified but secondary is verified", async () => {
      const uniqueId = Date.now() + 55;
      const secVerifiedEmail = `secondary_${uniqueId}@example.com`;
      mockGithubConfig.userResponse = {
        id: uniqueId,
        login: `octo_sec_${uniqueId}`,
        name: "Octo Secondary",
        avatar_url: `https://avatars.github.com/u/${uniqueId}`,
      };
      mockGithubConfig.emailsResponse = [
        { email: "primary_unverified@example.com", primary: true, verified: false },
        { email: secVerifiedEmail, primary: false, verified: true },
      ];

      const res = await request(
        `/auth/github/callback?code=valid_code_sec&state=${validStateToken}`,
        { headers: { Cookie: `devai_oauth_nonce=${validCookieNonce}` } }
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.user.email, secVerifiedEmail);

      // Restore mock
      mockGithubConfig.emailsResponse = [
        { email: "octo_primary@example.com", primary: true, verified: true },
      ];
    });

    // ========================================================
    // 3. SUCCESSFUL USER CREATION VIA GITHUB
    // ========================================================
    console.log("\n--- 3. GitHub User Creation & Token Generation ---");

    const uniqueGithubId = Date.now();
    const githubEmail = `github_user_${uniqueGithubId}@example.com`;

    mockGithubConfig.userResponse = {
      id: uniqueGithubId,
      login: `octo_${uniqueGithubId}`,
      name: "Octo New User",
      avatar_url: "https://avatars.github.com/u/newuser",
    };
    mockGithubConfig.emailsResponse = [
      { email: githubEmail, primary: true, verified: true },
    ];

    let githubAccessToken;
    let githubRefreshToken;
    let createdUserId;

    await test("Successfully authenticates and creates new user with MEMBER role", async () => {
      const res = await request(
        `/auth/github/callback?code=valid_code_123&state=${validStateToken}`,
        { headers: { Cookie: `devai_oauth_nonce=${validCookieNonce}` } }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.accessToken);
      assert.ok(res.body.data.refreshToken);
      assert.equal(res.body.data.user.email, githubEmail);
      assert.equal(res.body.data.user.role, "MEMBER"); // Role must always be MEMBER
      assert.equal(res.body.data.user.password, undefined); // Password never returned

      githubAccessToken = res.body.data.accessToken;
      githubRefreshToken = res.body.data.refreshToken;
      createdUserId = res.body.data.user.id;
    });

    await test("Database stores provider account in user_auth_accounts table", async () => {
      const [record] = await db
        .select()
        .from(userAuthAccounts)
        .where(
          and(
            eq(userAuthAccounts.provider, "GITHUB"),
            eq(userAuthAccounts.providerAccountId, String(uniqueGithubId))
          )
        );

      assert.ok(record);
      assert.equal(record.userId, createdUserId);
      assert.equal(record.providerEmail, githubEmail);
    });

    await test("Database stores GitHub connection in github_connections with encrypted token and granted scopes", async () => {
      const [conn] = await db
        .select()
        .from(githubConnections)
        .where(eq(githubConnections.userId, createdUserId));

      assert.ok(conn);
      assert.equal(conn.githubUserId, String(uniqueGithubId));
      assert.ok(conn.accessTokenEncrypted);
      assert.ok(conn.scopes);
      assert.ok(conn.scopes.includes("read:org"));
      assert.ok(conn.scopes.includes("repo"));
    });

    await test("Database stores user with password = null", async () => {
      const [userRecord] = await db
        .select()
        .from(users)
        .where(eq(users.id, createdUserId));

      assert.ok(userRecord);
      assert.equal(userRecord.password, null);
    });

    await test("Password login is blocked for GitHub-created user without password (400 Bad Request)", async () => {
      const res = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: githubEmail,
          password: "AnyPassword123!",
        }),
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("Password login is not enabled"));
    });

    await test("Neither GitHub client secret nor GitHub access token is exposed to client", async () => {
      const res = await request(
        `/auth/github/callback?code=valid_code_123&state=${validStateToken}`,
        { headers: { Cookie: `devai_oauth_nonce=${validCookieNonce}` } }
      );
      const jsonStr = JSON.stringify(res.body);
      assert.ok(!jsonStr.includes("test_github_client_secret"));
      assert.ok(!jsonStr.includes("mock_gh_access_token_secret"));
    });

    // ========================================================
    // 4. EXISTING GITHUB USER LOGIN
    // ========================================================
    console.log("\n--- 4. Existing GitHub Account Login ---");

    await test("Subsequent login with existing GitHub account authenticates existing user without duplicates", async () => {
      const res = await request(
        `/auth/github/callback?code=valid_code_456&state=${validStateToken}`,
        { headers: { Cookie: `devai_oauth_nonce=${validCookieNonce}` } }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.data.user.id, createdUserId);
      assert.equal(res.body.data.user.email, githubEmail);
    });

    // ========================================================
    // 5. EXISTING DEVAI USER ACCOUNT LINKING
    // ========================================================
    console.log("\n--- 5. Account Linking to Existing User ---");

    const existingUserEmail = `registered_first_${Date.now()}@example.com`;
    // Register via traditional email/password first
    const registerRes = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Existing Local User",
        email: existingUserEmail,
        password: "Password@123",
      }),
    });
    assert.equal(registerRes.status, 201);
    const existingLocalUserId = registerRes.body.data.id;

    // Now user logs in with GitHub with the same verified email
    const secondGithubId = Date.now() + 1000;
    mockGithubConfig.userResponse = {
      id: secondGithubId,
      login: `octo_linked_${secondGithubId}`,
      name: "Octo Linked",
      avatar_url: "https://avatars.github.com/u/linked",
    };
    mockGithubConfig.emailsResponse = [
      { email: existingUserEmail, primary: true, verified: true },
    ];

    await test("Links GitHub account to existing DEVAI user with matching verified email", async () => {
      const res = await request(
        `/auth/github/callback?code=link_code_789&state=${validStateToken}`,
        { headers: { Cookie: `devai_oauth_nonce=${validCookieNonce}` } }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.data.user.id, existingLocalUserId); // Same user ID!
      assert.equal(res.body.data.user.email, existingUserEmail);

      // Verify link in DB
      const [linkRecord] = await db
        .select()
        .from(userAuthAccounts)
        .where(
          and(
            eq(userAuthAccounts.provider, "GITHUB"),
            eq(userAuthAccounts.providerAccountId, String(secondGithubId))
          )
        );
      assert.ok(linkRecord);
      assert.equal(linkRecord.userId, existingLocalUserId);
    });

    await test("Linked account retains password login functionality", async () => {
      const res = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: existingUserEmail,
          password: "Password@123",
        }),
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.user.id, existingLocalUserId);
    });

    // ========================================================
    // 6. DEVAI TOKEN COMPATIBILITY
    // ========================================================
    console.log("\n--- 6. DEVAI Token Contract Compatibility ---");

    await test("Issued access token works with GET /auth/me", async () => {
      const res = await request("/auth/me", {
        headers: { Authorization: `Bearer ${githubAccessToken}` },
      });
      assert.equal(res.status, 200);
      const user = res.body.data?.user || res.body.data;
      assert.equal(user.id, createdUserId);
      assert.equal(user.email, githubEmail);
    });

    let newAccessToken;
    await test("Issued refresh token works with POST /auth/refresh", async () => {
      const res = await request("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken: githubRefreshToken }),
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.data.accessToken);
      newAccessToken = res.body.data.accessToken;
    });

    await test("New access token from refresh works with GET /auth/me", async () => {
      const res = await request("/auth/me", {
        headers: { Authorization: `Bearer ${newAccessToken}` },
      });
      assert.equal(res.status, 200);
      const user = res.body.data?.user || res.body.data;
      assert.equal(user.id, createdUserId);
    });

    await test("POST /auth/logout invalidates refresh token", async () => {
      const res = await request("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken: githubRefreshToken }),
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });

    await test("Activity logs record GITHUB_LOGIN and GITHUB_ACCOUNT_LINKED events", async () => {
      const [loginLog] = await db
        .select()
        .from(activityLogs)
        .where(
          and(
            eq(activityLogs.userId, createdUserId),
            eq(activityLogs.action, "GITHUB_LOGIN")
          )
        );
      assert.ok(loginLog);

      const [linkLog] = await db
        .select()
        .from(activityLogs)
        .where(
          and(
            eq(activityLogs.userId, existingLocalUserId),
            eq(activityLogs.action, "GITHUB_ACCOUNT_LINKED")
          )
        );
      assert.ok(linkLog);
    });

  } finally {
    globalThis.fetch = originalFetch;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
  }

  console.log("\n========================================================");
  console.log(`📊 GITHUB OAUTH TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
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

runGithubOAuthTests().catch((err) => {
  console.error("Test suite encountered fatal error:", err);
  process.exit(1);
});
