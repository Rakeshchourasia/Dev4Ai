import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testFiles = [
  "verify-all.js",
  "github-oauth.test.js",
  "github-connection.test.js",
  "github-orgs.test.js",
  "github-repos.test.js",
  "squad-github-repos.test.js",
  "github-issues.test.js",
  "github-prs.test.js",
  "github-webhooks.test.js",
  "ui-smoke.test.js",
];

console.log("========================================================");
console.log("🚀 EXECUTING DEVAI API V1 COMPLETE TEST SUITE");
console.log("========================================================\n");

let failedCount = 0;

for (const file of testFiles) {
  const filePath = path.join(__dirname, file);
  console.log(`\n▶ Running: ${file}`);
  const result = spawnSync(process.execPath, [filePath], {
    stdio: "inherit",
    env: { ...process.env },
  });

  if (result.status !== 0) {
    console.error(`❌ Suite failed: ${file} (exit code: ${result.status})`);
    failedCount++;
  } else {
    console.log(`✅ Suite passed: ${file}`);
  }
}

console.log("\n========================================================");
if (failedCount > 0) {
  console.error(`❌ TEST SUITE FAILED: ${failedCount} suite(s) failed`);
  process.exit(1);
} else {
  console.log("🎉 ALL DEVAI TEST SUITES PASSED SUCCESSFULLY!");
  process.exit(0);
}
