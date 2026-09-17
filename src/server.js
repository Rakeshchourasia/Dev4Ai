import app from "./app.js";
import config, { validateGithubConfig } from "./config/index.js";
import { db, pool } from "./db/index.js";
import { sql } from "drizzle-orm";

let server;

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

async function shutdown(signal) {
  console.log(`\n⚠️  ${signal} received — shutting down gracefully...`);

  // 1. Stop accepting new HTTP connections
  server.close(async () => {
    console.log("🔌 HTTP server closed.");

    try {
      // 2. Close the PostgreSQL connection pool
      await pool.end();
      console.log("🗄️  Database pool closed.");
    } catch (err) {
      console.error("❌ Error closing database pool:", err);
    }

    console.log("✅ Graceful shutdown complete.");
    process.exit(0);
  });

  // Force exit after 10 seconds if something hangs
  setTimeout(() => {
    console.error("❌ Forced shutdown after timeout.");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

// ==========================================
// START SERVER
// ==========================================

async function startServer() {
  try {
    // Validate GitHub OAuth configuration when configured or in production
    if (config.githubClientId || process.env.NODE_ENV === "production") {
      validateGithubConfig();
      console.log("✅ GitHub OAuth configuration validated");
    }

    await db.execute(sql`SELECT 1`);

    console.log("✅ Database Connected");

    server = app.listen(config.port, () => {
      console.log(`🚀 Server started on port ${config.port}`);
    });
  } catch (error) {
    console.error("❌ Error starting server:", error);
    process.exit(1);
  }
}

startServer();