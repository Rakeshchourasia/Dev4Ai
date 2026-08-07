import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import config from "../config/index.js";

const pool = new Pool({
  connectionString: config.databaseUrl,
});

export const db = drizzle(pool);