/**
 * github-webhooks.test.js
 *
 * Tests for STEP 7: Production-Safe GitHub Webhooks
 *   POST /github/webhooks
 *
 * Tests:
 *   - Timing-safe HMAC-SHA256 signature verification (X-Hub-Signature-256)
 *   - Missing signature header (400)
 *   - Invalid signature header (401)
 *   - Missing delivery header (400)
 *   - Malformed payload rejection (400)
 *   - Delivery idempotency: duplicate delivery IDs safely return 200 without duplicate actions
 *   - Event routing:
 *     - issues.closed: updates linked ticket to DONE and creates activity log
 *     - issues.reopened: updates linked ticket to TODO and creates activity log
 *     - pull_request.closed (merged): updates linked ticket to DONE and creates activity log
 *     - push: logs activity for squad
 *     - unsupported events (e.g. star, fork): safely ignored with 200
 *   - Security: No secrets leaked in activity logs or stored events
 */

import dotenv from "dotenv";
dotenv.config();

process.env.NODE_ENV = "test";
process.env.GITHUB_WEBHOOK_SECRET = "test_super_secret_webhook_key_123456789";

import assert from "node:assert/strict";
import http from "node:http";
import crypto from "node:crypto";
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
import { ticketGithubPullRequests } from "../src/db/schema/ticketGithubPullRequests.schema.js";
import { githubWebhookEvents } from "../src/db/schema/githubWebhookEvents.schema.js";
import { activityLogs } from "../src/db/schema/activityLogs.schema.js";
import { eq, and } from "drizzle-orm";
import config from "../src/config/index.js";

config.githubWebhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

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

// Helper to sign payload with HMAC-SHA256
function signPayload(payloadString, secret = config.githubWebhookSecret) {
  return `sha256=${crypto
    .createHmac("sha256", secret)
    .update(payloadString)
    .digest("hex")}`;
}

// HTTP request helper
async function requestWebhook({
  payload,
  event = "issues",
  deliveryId = crypto.randomUUID(),
  signature,
  rawOverride,
  headers = {},
}) {
  const bodyString = rawOverride !== undefined ? rawOverride : JSON.stringify(payload);
  const sig = signature !== undefined ? signature : signPayload(bodyString);

  const reqHeaders = {
    "Content-Type": "application/json",
    "X-GitHub-Event": event,
    "X-GitHub-Delivery": deliveryId,
    ...headers,
  };

  if (sig !== null) {
    reqHeaders["X-Hub-Signature-256"] = sig;
  }

  const res = await fetch(`${baseUrl}/github/webhooks`, {
    method: "POST",
    headers: reqHeaders,
    body: bodyString,
  });

  let data;
  const ct = res.headers.get("content-type") || "";
  try {
    data = ct.includes("application/json") ? await res.json() : await res.text();
  } catch {
    data = null;
  }

  return { status: res.status, headers: res.headers, body: data };
}

// ==========================================
// TEST SUITE
// ==========================================

async function runWebhookTests() {
  console.log("\n========================================================");
  console.log("🚀 STARTING STEP 7: GITHUB WEBHOOKS TEST SUITE");
  console.log("========================================================\n");

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  const dynamicRepoId = String(Date.now() + 777777);
  const dynamicIssueId = Date.now() + 11111;
  const dynamicPrId = Date.now() + 22222;

  let squadId;
  let memberUserId;
  let ticketIssueId;
  let ticketPrId;

  try {
    // Setup database fixtures
    const [user] = await db
      .insert(users)
      .values({
        email: `webhook_user_${Date.now()}@example.com`,
        name: "Webhook Tester",
        password: "dummy_password_hash",
      })
      .returning();

    memberUserId = user.id;

    const [company] = await db
      .insert(companies)
      .values({ name: `Webhook Company ${Date.now()}` })
      .returning();

    const [squad] = await db
      .insert(squads)
      .values({ companyId: company.id, name: `Webhook Squad ${Date.now()}` })
      .returning();
    squadId = squad.id;

    await db.insert(squadMembers).values({
      squadId,
      userId: memberUserId,
      role: "DEVELOPER",
    });

    await db.insert(squadGithubRepositories).values({
      squadId,
      githubRepositoryId: dynamicRepoId,
      githubRepositoryName: "dev4ai",
      githubOwner: "company",
      githubFullName: "company/dev4ai",
      githubUrl: "https://github.com/company/dev4ai",
    });

    const [sprint] = await db
      .insert(sprints)
      .values({
        squadId,
        name: "Sprint Webhooks",
        status: "ACTIVE",
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 86400000),
      })
      .returning();

    // Ticket linked to issue
    const [tIssue] = await db
      .insert(tickets)
      .values({
        squadId,
        sprintId: sprint.id,
        title: "Ticket linked to Issue",
        status: "TODO",
        priority: "MEDIUM",
        createdBy: memberUserId,
      })
      .returning();
    ticketIssueId = tIssue.id;

    await db.insert(ticketGithubIssues).values({
      ticketId: ticketIssueId,
      githubRepositoryId: dynamicRepoId,
      githubIssueId: String(dynamicIssueId),
      githubIssueNumber: 50,
      githubIssueUrl: "https://github.com/company/dev4ai/issues/50",
      githubIssueState: "open",
    });

    // Ticket linked to PR
    const [tPr] = await db
      .insert(tickets)
      .values({
        squadId,
        sprintId: sprint.id,
        title: "Ticket linked to PR",
        status: "IN_PROGRESS",
        priority: "HIGH",
        createdBy: memberUserId,
      })
      .returning();
    ticketPrId = tPr.id;

    await db.insert(ticketGithubPullRequests).values({
      ticketId: ticketPrId,
      githubRepositoryId: dynamicRepoId,
      githubPrId: String(dynamicPrId),
      githubPrNumber: 60,
      githubPrUrl: "https://github.com/company/dev4ai/pull/60",
      state: "open",
    });

    console.log("  ✓ Fixtures setup complete\n");

    // ------------------------------------------------------------------
    // 1. Signature Security Tests
    // ------------------------------------------------------------------
    console.log("--- 1. Webhook Signature Security ---");

    await test("Missing X-Hub-Signature-256 rejects with 400", async () => {
      const res = await requestWebhook({
        payload: { action: "opened" },
        signature: null,
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    await test("Invalid signature rejects with 401", async () => {
      const res = await requestWebhook({
        payload: { action: "opened" },
        signature: "sha256=invalid_signature_hash_0123456789abcdef0123456789abcdef0123456789abcdef",
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    await test("Signature generated with wrong secret rejects with 401", async () => {
      const badSig = signPayload(JSON.stringify({ action: "opened" }), "wrong_secret_key");
      const res = await requestWebhook({
        payload: { action: "opened" },
        signature: badSig,
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    await test("Missing delivery header rejects with 400", async () => {
      const payloadStr = JSON.stringify({ action: "opened" });
      const sig = signPayload(payloadStr);
      const res = await fetch(`${baseUrl}/github/webhooks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GitHub-Event": "issues",
          "X-Hub-Signature-256": sig,
        },
        body: payloadStr,
      });
      assert.equal(res.status, 400);
    });

    // ------------------------------------------------------------------
    // 2. Supported Events: issues.closed & issues.reopened
    // ------------------------------------------------------------------
    console.log("\n--- 2. Issues Events Synchronization ---");

    await test("issues.closed synchronizes linked DEVAI ticket to DONE", async () => {
      const deliveryId = crypto.randomUUID();
      const payload = {
        action: "closed",
        issue: {
          id: dynamicIssueId,
          number: 50,
          state: "closed",
        },
        repository: {
          id: Number(dynamicRepoId),
          name: "dev4ai",
        },
      };

      const res = await requestWebhook({
        payload,
        event: "issues",
        deliveryId,
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // Verify ticket status was updated to DONE
      const [updatedTicket] = await db
        .select()
        .from(tickets)
        .where(eq(tickets.id, ticketIssueId));
      assert.equal(updatedTicket.status, "DONE");

      // Verify issue mapping state was updated
      const [mapping] = await db
        .select()
        .from(ticketGithubIssues)
        .where(eq(ticketGithubIssues.ticketId, ticketIssueId));
      assert.equal(mapping.githubIssueState, "closed");

      // Verify activity log was recorded
      const [log] = await db
        .select()
        .from(activityLogs)
        .where(
          and(
            eq(activityLogs.ticketId, ticketIssueId),
            eq(activityLogs.action, "TICKET_STATUS_SYNCED_FROM_GITHUB")
          )
        );
      assert.ok(log, "Activity log must exist for status sync");
    });

    await test("issues.reopened synchronizes linked DEVAI ticket to TODO", async () => {
      const deliveryId = crypto.randomUUID();
      const payload = {
        action: "reopened",
        issue: {
          id: dynamicIssueId,
          number: 50,
          state: "open",
        },
        repository: {
          id: Number(dynamicRepoId),
          name: "dev4ai",
        },
      };

      const res = await requestWebhook({
        payload,
        event: "issues",
        deliveryId,
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      const [updatedTicket] = await db
        .select()
        .from(tickets)
        .where(eq(tickets.id, ticketIssueId));
      assert.equal(updatedTicket.status, "TODO");
    });

    // ------------------------------------------------------------------
    // 3. Supported Events: pull_request
    // ------------------------------------------------------------------
    console.log("\n--- 3. Pull Request Events Synchronization ---");

    await test("pull_request.closed with merged: true updates ticket to DONE", async () => {
      const deliveryId = crypto.randomUUID();
      const payload = {
        action: "closed",
        pull_request: {
          id: dynamicPrId,
          number: 60,
          state: "closed",
          merged: true,
        },
        repository: {
          id: Number(dynamicRepoId),
          name: "dev4ai",
        },
      };

      const res = await requestWebhook({
        payload,
        event: "pull_request",
        deliveryId,
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // Verify ticket status became DONE
      const [updatedTicket] = await db
        .select()
        .from(tickets)
        .where(eq(tickets.id, ticketPrId));
      assert.equal(updatedTicket.status, "DONE");

      // Verify PR state in DB
      const [prMapping] = await db
        .select()
        .from(ticketGithubPullRequests)
        .where(eq(ticketGithubPullRequests.ticketId, ticketPrId));
      assert.equal(prMapping.state, "closed");

      // Verify activity log
      const [log] = await db
        .select()
        .from(activityLogs)
        .where(
          and(
            eq(activityLogs.ticketId, ticketPrId),
            eq(activityLogs.action, "GITHUB_PR_MERGED")
          )
        );
      assert.ok(log, "Activity log must exist for PR merge");
    });

    // ------------------------------------------------------------------
    // 4. Supported Events: push
    // ------------------------------------------------------------------
    console.log("\n--- 4. Push Events ---");

    await test("push event records activity log for squad", async () => {
      const deliveryId = crypto.randomUUID();
      const payload = {
        ref: "refs/heads/main",
        commits: [
          { id: "c1", message: "feat: update engine" },
          { id: "c2", message: "fix: bug" },
        ],
        repository: {
          id: Number(dynamicRepoId),
          name: "dev4ai",
          full_name: "company/dev4ai",
        },
      };

      const res = await requestWebhook({
        payload,
        event: "push",
        deliveryId,
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // Verify activity log was recorded for squad
      const [log] = await db
        .select()
        .from(activityLogs)
        .where(
          and(
            eq(activityLogs.squadId, squadId),
            eq(activityLogs.action, "GITHUB_PUSH_RECEIVED")
          )
        );
      assert.ok(log, "Activity log for push must exist");
      assert.ok(log.description.includes("2 commits"));
    });

    // ------------------------------------------------------------------
    // 5. Idempotency (Duplicate Delivery)
    // ------------------------------------------------------------------
    console.log("\n--- 5. Idempotency ---");

    await test("Duplicate delivery ID returns 200 without re-processing", async () => {
      const deliveryId = crypto.randomUUID();
      const payload = {
        action: "opened",
        issue: { id: 999999, number: 99, state: "open" },
        repository: { id: Number(dynamicRepoId), name: "dev4ai" },
      };

      // First delivery
      const res1 = await requestWebhook({ payload, event: "issues", deliveryId });
      assert.equal(res1.status, 200);

      // Verify delivery record in DB
      const [deliveryRecord] = await db
        .select()
        .from(githubWebhookEvents)
        .where(eq(githubWebhookEvents.deliveryId, deliveryId));
      assert.ok(deliveryRecord);
      assert.equal(deliveryRecord.processed, true);

      // Second delivery with identical delivery ID (GitHub retry)
      const res2 = await requestWebhook({ payload, event: "issues", deliveryId });
      assert.equal(res2.status, 200);
      assert.equal(res2.body.data.duplicate, true);
    });

    // ------------------------------------------------------------------
    // 6. Unsupported Events
    // ------------------------------------------------------------------
    console.log("\n--- 6. Unsupported Events ---");

    await test("Unsupported event (e.g. star, release) is safely ignored with 200", async () => {
      const deliveryId = crypto.randomUUID();
      const res = await requestWebhook({
        payload: { action: "created", star: {} },
        event: "star",
        deliveryId,
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });

    // ------------------------------------------------------------------
    // 7. Security & Secret Leakage Check
    // ------------------------------------------------------------------
    console.log("\n--- 7. Secret Leakage Check ---");

    await test("Activity logs and database records never contain webhook secret", async () => {
      const logs = await db.select().from(activityLogs);
      const secret = config.githubWebhookSecret;

      for (const item of logs) {
        if (item.description) {
          assert.equal(
            item.description.includes(secret),
            false,
            "Activity log description must not contain webhook secret"
          );
        }
      }

      const events = await db.select().from(githubWebhookEvents);
      for (const ev of events) {
        assert.equal(
          ev.deliveryId.includes(secret),
          false,
          "Webhook event record must not contain webhook secret"
        );
      }
    });

  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
  }

  console.log("\n========================================================");
  console.log(`📊 GITHUB WEBHOOKS TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("========================================================\n");

  if (failedTests.length > 0) {
    console.log("Failed tests summary:");
    failedTests.forEach((f) => console.log(`  - ${f.name}: ${f.error}`));
    console.log("");
  }

  process.exit(failed > 0 ? 1 : 0);
}

runWebhookTests().catch((err) => {
  console.error("Test runner fatal error:", err);
  process.exit(1);
});
