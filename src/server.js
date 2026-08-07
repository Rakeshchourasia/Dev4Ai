import app from "./app.js";
import config from "./config/index.js";
import { db } from "./db/index.js";
import { sql } from "drizzle-orm";

async function startServer() {
  try {
    await db.execute(sql`SELECT 1`);

    console.log("✅ Database Connected");

    app.listen(config.port, () => {
      console.log(`🚀 Server started on port ${config.port}`);
    });
  } catch (error) {
    console.error("❌ Error starting server:", error);
    process.exit(1);
  }
}

startServer();