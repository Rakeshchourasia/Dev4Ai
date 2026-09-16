import dotenv from "dotenv";
dotenv.config();
process.env.NODE_ENV = "test";

import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";
import { pool } from "../src/db/index.js";

const server = http.createServer(app);

server.listen(0, async () => {
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  console.log(`Testing UI smoke endpoints at ${baseUrl}...`);

  try {
    // 1. Check GET / serves public/index.html
    const indexRes = await fetch(`${baseUrl}/`);
    assert.equal(indexRes.status, 200, "Index page should return 200");
    const indexText = await indexRes.text();
    assert.ok(indexText.includes("Dev4AI Enterprise PM Dashboard"), "Index should contain title");
    assert.ok(indexText.includes("col-todo"), "Index should contain Kanban col-todo");
    assert.ok(indexText.includes("col-in-progress"), "Index should contain col-in-progress");
    assert.ok(indexText.includes("col-done"), "Index should contain col-done");
    assert.ok(indexText.includes("activity-feed-list"), "Index should contain activity-feed-list");
    assert.ok(indexText.includes("authModal"), "Index should contain authModal");
    assert.ok(indexText.includes("createTicketModal"), "Index should contain createTicketModal");
    assert.ok(indexText.includes("createSprintModal"), "Index should contain createSprintModal");
    assert.ok(indexText.includes("linkRepoModal"), "Index should contain linkRepoModal");
    assert.ok(indexText.includes("importIssueModal"), "Index should contain importIssueModal");
    assert.ok(indexText.includes('<script src="/app.js"></script>'), "Index should link app.js");
    console.log("  ✓ PASS: GET / serves index.html with all required DOM element IDs");

    // 2. Check GET /app.js serves JavaScript
    const jsRes = await fetch(`${baseUrl}/app.js`);
    assert.equal(jsRes.status, 200, "app.js should return 200");
    const jsText = await jsRes.text();
    assert.ok(jsText.includes("Dev4AI Enterprise PM Dashboard"), "app.js should have header");
    assert.ok(jsText.includes("handleCreateTicket"), "app.js should have handleCreateTicket");
    assert.ok(jsText.includes("changeStatus"), "app.js should have changeStatus");
    assert.ok(jsText.includes("handleLogin"), "app.js should have handleLogin");
    console.log("  ✓ PASS: GET /app.js serves application logic correctly");

    // 3. Health check
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.equal(healthRes.status, 200, "Health endpoint should return 200");
    console.log("  ✓ PASS: GET /health returns 200");

    console.log("\n========================================================");
    console.log("🎉 UI STATIC SERVING & ASSET SMOKE TEST PASSED!");
    console.log("========================================================");
  } catch (err) {
    console.error("  ✗ FAIL:", err);
    process.exitCode = 1;
  } finally {
    server.close();
    await pool.end();
  }
});
