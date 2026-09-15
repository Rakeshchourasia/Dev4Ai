import dotenv from "dotenv";
dotenv.config();

process.env.NODE_ENV = "test";

import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";
import { pool } from "../src/db/index.js";

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

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
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

async function runAllTests() {
  console.log("\n========================================================");
  console.log("🚀 DEVAI BACKEND - COMPREHENSIVE VERIFICATION SUITE");
  console.log("========================================================\n");

  // Start temporary test server
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`Test server running on ${baseUrl}\n`);
      resolve();
    });
  });

  let adminToken;
  let adminId;
  let memberToken;
  let memberId;
  let otherMemberToken;
  let otherMemberId;

  let testCompanyId;
  let squadAId;
  let squadBId;
  let sprint1Id;
  let sprint2Id;
  let ticket1Id;

  try {
    // ========================================================
    // 1. SYSTEM & SECURITY
    // ========================================================
    console.log("\n--- 1. System, Health & Security ---");

    await test("GET /health returns 200 with database connected", async () => {
      const res = await request("/health");
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, "ok");
      assert.equal(res.body.data.database, "connected");
    });

    await test("Security headers are enforced (Helmet, no X-Powered-By)", async () => {
      const res = await request("/health");
      assert.equal(res.headers.get("x-powered-by"), null);
      assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    });

    await test("GET /api-docs returns Swagger documentation", async () => {
      const res = await request("/api-docs/");
      assert.equal(res.status, 200);
      assert.ok(typeof res.body === "string" && res.body.includes("Swagger UI"));
    });

    await test("404 handler returns structured JSON for non-existent route", async () => {
      const res = await request("/unregistered-route-xyz");
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.ok(res.body.message.includes("Cannot GET /unregistered-route-xyz"));
    });

    // ========================================================
    // 2. AUTHENTICATION & SESSIONS
    // ========================================================
    console.log("\n--- 2. Authentication & Sessions ---");

    const uniqueTimestamp = Date.now();
    const testMemberEmail = `member_${uniqueTimestamp}@dev4ai.com`;

    await test("POST /auth/register successfully registers a new member", async () => {
      const res = await request("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Test User",
          email: testMemberEmail,
          password: "Password@123",
        }),
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.email, testMemberEmail);
      assert.equal(res.body.data.role, "MEMBER");
      otherMemberId = res.body.data.id;
    });

    await test("POST /auth/register rejects duplicate email with 409 Conflict", async () => {
      const res = await request("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Duplicate User",
          email: testMemberEmail,
          password: "Password@123",
        }),
      });
      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
    });

    await test("POST /auth/login with seeded admin credentials", async () => {
      const res = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "admin@dev4ai.com",
          password: "Admin@123",
        }),
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.accessToken);
      assert.ok(res.body.data.refreshToken);
      assert.equal(res.body.data.user.role, "ADMIN");
      adminToken = res.body.data.accessToken;
      adminId = res.body.data.user.id;
    });

    await test("POST /auth/login with seeded member credentials", async () => {
      const res = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "member@dev4ai.com",
          password: "Member@123",
        }),
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.accessToken);
      memberToken = res.body.data.accessToken;
      memberId = res.body.data.user.id;
    });

    await test("POST /auth/login for newly registered member", async () => {
      const res = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: testMemberEmail,
          password: "Password@123",
        }),
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.data.accessToken);
      otherMemberToken = res.body.data.accessToken;
    });

    await test("POST /auth/login rejects invalid password with 401 Unauthorized", async () => {
      const res = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "admin@dev4ai.com",
          password: "WrongPassword999",
        }),
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    await test("GET /auth/me returns current user profile with valid Bearer token", async () => {
      const res = await request("/auth/me", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const user = res.body.data?.user || res.body.data;
      assert.equal(user.email, "admin@dev4ai.com");
    });

    await test("GET /auth/me rejects request without Bearer token with 401 Unauthorized", async () => {
      const res = await request("/auth/me");
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    let currentRefreshToken;
    await test("POST /auth/refresh returns new access token with valid refresh token", async () => {
      const loginRes = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "admin@dev4ai.com",
          password: "Admin@123",
        }),
      });
      currentRefreshToken = loginRes.body.data.refreshToken;

      const res = await request("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.data.accessToken);
    });

    await test("POST /auth/logout invalidates session", async () => {
      const res = await request("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });

    // ========================================================
    // 3. RBAC (ROLE-BASED ACCESS CONTROL)
    // ========================================================
    console.log("\n--- 3. Role-Based Access Control (RBAC) ---");

    await test("MEMBER role is forbidden (403) from creating a company", async () => {
      const res = await request("/companies", {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ name: "Unauthorized Corp" }),
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    await test("MEMBER role is forbidden (403) from creating a squad", async () => {
      const res = await request("/squads", {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({ name: "Unauthorized Squad", companyId: "00000000-0000-0000-0000-000000000000" }),
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    await test("MEMBER role is forbidden (403) from creating a sprint", async () => {
      const res = await request("/sprints", {
        method: "POST",
        headers: { Authorization: `Bearer ${memberToken}` },
        body: JSON.stringify({
          name: "Unauthorized Sprint",
          squadId: "00000000-0000-0000-0000-000000000000",
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    // ========================================================
    // 4. COMPANY CRUD
    // ========================================================
    console.log("\n--- 4. Company Management ---");

    await test("ADMIN creates a new company", async () => {
      const res = await request("/companies", {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ name: `Test Corp ${uniqueTimestamp}` }),
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.id);
      testCompanyId = res.body.data.id;
    });

    await test("ADMIN gets company by ID", async () => {
      const res = await request(`/companies/${testCompanyId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.id, testCompanyId);
    });

    await test("ADMIN updates company details", async () => {
      const res = await request(`/companies/${testCompanyId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ name: `Updated Corp ${uniqueTimestamp}` }),
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.name, `Updated Corp ${uniqueTimestamp}`);
    });

    // ========================================================
    // 5. SQUAD MANAGEMENT & ISOLATION
    // ========================================================
    console.log("\n--- 5. Squad Management & Isolation ---");

    await test("ADMIN creates Squad A", async () => {
      const res = await request("/squads", {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          companyId: testCompanyId,
          name: `Squad Alpha ${uniqueTimestamp}`,
        }),
      });
      assert.equal(res.status, 201);
      squadAId = res.body.data.id;
    });

    await test("ADMIN creates Squad B", async () => {
      const res = await request("/squads", {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          companyId: testCompanyId,
          name: `Squad Beta ${uniqueTimestamp}`,
        }),
      });
      assert.equal(res.status, 201);
      squadBId = res.body.data.id;
    });

    await test("ADMIN adds Member 1 to Squad A via /squads/:squadId/members", async () => {
      const res = await request(`/squads/${squadAId}/members`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ userId: memberId }),
      });
      assert.equal(res.status, 201);
    });

    await test("POST /squad-members allows adding user via /squad-members root endpoint", async () => {
      const res = await request("/squad-members", {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ squadId: squadBId, userId: otherMemberId }),
      });
      assert.equal(res.status, 201);
    });

    await test("Prevents duplicate squad membership with 409 Conflict", async () => {
      const res = await request(`/squads/${squadAId}/members`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ userId: memberId }),
      });
      assert.equal(res.status, 409);
    });

    await test("GET /squads/:squadId/members returns squad members list", async () => {
      const res = await request(`/squads/${squadAId}/members`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.some((m) => m.userId === memberId));
    });

    await test("GET /squads/:squadId/members/:userId checks membership status", async () => {
      const res = await request(`/squads/${squadAId}/members/${memberId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.isMember, true);
    });

    await test("Squad Isolation: Member of Squad B cannot access Squad A tickets (403 Forbidden)", async () => {
      const res = await request(`/tickets/squad/${squadAId}`, {
        headers: { Authorization: `Bearer ${otherMemberToken}` },
      });
      assert.equal(res.status, 403);
    });

    // ========================================================
    // 6. SPRINT PLANNING & 1-ACTIVE RULE
    // ========================================================
    console.log("\n--- 6. Sprint Planning & 1-Active Rule ---");

    await test("Rejects sprint creation when startDate >= endDate (400 Bad Request)", async () => {
      const now = new Date();
      const res = await request("/sprints", {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          squadId: squadAId,
          name: "Invalid Sprint",
          startDate: now.toISOString(),
          endDate: now.toISOString(), // same date
        }),
      });
      assert.equal(res.status, 400);
      assert.ok(res.body.message.includes("Start date must be before end date"));
    });

    const sprint1Start = new Date(Date.now() + 1000 * 60 * 60 * 24 * 1);
    const sprint1End = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

    await test("ADMIN creates Sprint 1 in PLANNED status", async () => {
      const res = await request("/sprints", {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          squadId: squadAId,
          name: "Sprint 1",
          startDate: sprint1Start.toISOString(),
          endDate: sprint1End.toISOString(),
        }),
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.data.status, "PLANNED");
      sprint1Id = res.body.data.id;
    });

    const sprint2Start = new Date(Date.now() + 1000 * 60 * 60 * 24 * 15);
    const sprint2End = new Date(Date.now() + 1000 * 60 * 60 * 24 * 28);

    await test("ADMIN creates Sprint 2 in PLANNED status (non-overlapping dates)", async () => {
      const res = await request("/sprints", {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          squadId: squadAId,
          name: "Sprint 2",
          startDate: sprint2Start.toISOString(),
          endDate: sprint2End.toISOString(),
        }),
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.data.status, "PLANNED");
      sprint2Id = res.body.data.id;
    });

    await test("Rejects overlapping sprint creation with 409 Conflict", async () => {
      const res = await request("/sprints", {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          squadId: squadAId,
          name: "Overlapping Sprint",
          startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20).toISOString(),
        }),
      });
      assert.equal(res.status, 409);
    });

    await test("Transitions Sprint 1 status: PLANNED -> ACTIVE", async () => {
      const res = await request(`/sprints/${sprint1Id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, "ACTIVE");
    });

    await test("Enforces 1-Active Rule: Cannot activate Sprint 2 while Sprint 1 is ACTIVE (400 Bad Request)", async () => {
      const res = await request(`/sprints/${sprint2Id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      assert.equal(res.status, 400);
      assert.ok(res.body.message.includes("An active sprint already exists"));
    });

    await test("Transitions Sprint 1 status: ACTIVE -> COMPLETED", async () => {
      const res = await request(`/sprints/${sprint1Id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, "COMPLETED");
    });

    await test("Rejects invalid status transition COMPLETED -> PLANNED (400 Bad Request)", async () => {
      const res = await request(`/sprints/${sprint1Id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: "PLANNED" }),
      });
      assert.equal(res.status, 400);
    });

    await test("Sprint 2 can now be activated after Sprint 1 is COMPLETED", async () => {
      const res = await request(`/sprints/${sprint2Id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, "ACTIVE");
    });

    // ========================================================
    // 7. TICKETS & ASSIGNEE MEMBERSHIP
    // ========================================================
    console.log("\n--- 7. Tickets & Assignee Membership ---");

    await test("Rejects ticket creation if assignedTo is NOT a member of the squad (400 Bad Request)", async () => {
      const res = await request("/tickets", {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          squadId: squadAId,
          sprintId: sprint2Id,
          title: "Invalid Ticket Assignee",
          priority: "HIGH",
          assignedTo: otherMemberId, // otherMember is in Squad B, not Squad A
        }),
      });
      assert.equal(res.status, 400);
      assert.ok(res.body.message.includes("not a member of this squad"));
    });

    await test("Successfully creates ticket when assignedTo IS a member of the squad", async () => {
      const res = await request("/tickets", {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          squadId: squadAId,
          sprintId: sprint2Id,
          title: "Setup CI/CD Pipeline",
          description: "Configure GitHub Actions workflows",
          priority: "HIGH",
          assignedTo: memberId,
        }),
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.data.status, "TODO");
      assert.equal(res.body.data.createdBy, adminId);
      ticket1Id = res.body.data.id;
    });

    await test("GET /tickets/squad/:squadId returns tickets for squad", async () => {
      const res = await request(`/tickets/squad/${squadAId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.some((t) => t.id === ticket1Id));
    });

    await test("GET /tickets/sprint/:sprintId returns tickets for sprint", async () => {
      const res = await request(`/tickets/sprint/${sprint2Id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.data.some((t) => t.id === ticket1Id));
    });

    await test("PATCH /tickets/:id/status transitions ticket TODO -> IN_PROGRESS -> DONE", async () => {
      let res = await request(`/tickets/${ticket1Id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, "IN_PROGRESS");

      res = await request(`/tickets/${ticket1Id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: "DONE" }),
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, "DONE");
    });

    await test("PATCH /tickets/:id rejects status in general update body (400 Bad Request)", async () => {
      const res = await request(`/tickets/${ticket1Id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ title: "Updated Title", status: "TODO" }),
      });
      assert.equal(res.status, 400);
      assert.ok(res.body.message.includes("ticket status endpoint"));
    });

    // ========================================================
    // 8. SPRINT DELETION SAFETY & AUDIT RETENTION
    // ========================================================
    console.log("\n--- 8. Sprint Deletion Safety & Audit Retention ---");

    await test("Rejects deleting sprint that has associated tickets (400 Bad Request)", async () => {
      // Sprint 2 has ticket1Id
      const res = await request(`/sprints/${sprint2Id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 400);
      assert.ok(res.body.message.includes("Cannot delete sprint with associated tickets"));
    });

    let emptySprintId;
    await test("ADMIN creates and deletes an empty sprint safely", async () => {
      const sStart = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
      const sEnd = new Date(Date.now() + 1000 * 60 * 60 * 24 * 40);

      const createRes = await request("/sprints", {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          squadId: squadAId,
          name: "Temporary Sprint",
          startDate: sStart.toISOString(),
          endDate: sEnd.toISOString(),
        }),
      });
      assert.equal(createRes.status, 201);
      emptySprintId = createRes.body.data.id;

      const deleteRes = await request(`/sprints/${emptySprintId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(deleteRes.status, 200);
    });

    // ========================================================
    // 9. ACTIVITY AUDIT TRAIL
    // ========================================================
    console.log("\n--- 9. Activity Logs & Audit Trail ---");

    await test("GET /activities/ticket/:ticketId returns audit logs for ticket", async () => {
      const res = await request(`/activities/ticket/${ticket1Id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length > 0);
    });

    await test("GET /activities/squad/:squadId returns audit logs for squad", async () => {
      const res = await request(`/activities/squad/${squadAId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
    });

    await test("Non-member of squad cannot view squad activities (403 Forbidden)", async () => {
      const res = await request(`/activities/squad/${squadAId}`, {
        headers: { Authorization: `Bearer ${otherMemberToken}` },
      });
      assert.equal(res.status, 403);
    });

    // ========================================================
    // 10. DASHBOARD METRICS
    // ========================================================
    console.log("\n--- 10. Dashboard Metrics ---");

    await test("GET /dashboard/squad/:squadId returns squad metrics", async () => {
      const res = await request(`/dashboard/squad/${squadAId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.data.tickets);
      assert.ok(res.body.data.priority);
      assert.ok(res.body.data.sprints);
    });

    await test("GET /dashboard/sprint/:sprintId returns sprint progress metrics", async () => {
      const res = await request(`/dashboard/sprint/${sprint2Id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.data.progressPercentage !== undefined);
      assert.ok(res.body.data.tickets);
    });

    // ========================================================
    // 11. ERROR CODES & DATABASE HANDLING
    // ========================================================
    console.log("\n--- 11. Error Handling & Validation Format ---");

    await test("Invalid UUID format triggers 400 Bad Request", async () => {
      const res = await request("/squads/invalid-uuid-format-123", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    await test("Validation error response matches standard envelope", async () => {
      const res = await request("/companies", {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ name: "" }), // empty name
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.message, "Validation failed");
      assert.ok(Array.isArray(res.body.errors));
    });

    // ========================================================
    // 12. RATE LIMITING TEST
    // ========================================================
    console.log("\n--- 12. Rate Limiter ---");

    await test("Rate limiter blocks repeated requests on /auth/login after limit", async () => {
      // Send 3 requests with x-test-rate-limit header (threshold is 2 in test mode)
      await request("/auth/login", {
        method: "POST",
        headers: { "x-test-rate-limit": "true" },
        body: JSON.stringify({ email: "rate@test.com", password: "Password@1" }),
      });
      await request("/auth/login", {
        method: "POST",
        headers: { "x-test-rate-limit": "true" },
        body: JSON.stringify({ email: "rate@test.com", password: "Password@1" }),
      });
      const thirdRes = await request("/auth/login", {
        method: "POST",
        headers: { "x-test-rate-limit": "true" },
        body: JSON.stringify({ email: "rate@test.com", password: "Password@1" }),
      });

      assert.equal(thirdRes.status, 429);
      assert.equal(thirdRes.body.success, false);
      assert.ok(thirdRes.body.message.includes("Too many"));
    });

  } finally {
    // Cleanup
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
  }

  console.log("\n========================================================");
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
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

runAllTests().catch((err) => {
  console.error("Test suite encountered fatal error:", err);
  process.exit(1);
});
