import { Pool } from "pg";

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "root", // use your actual postgres password
  database: "dev4ai",
});

try {
  const result = await pool.query("SELECT NOW()");
  console.log(result.rows);
} catch (err) {
  console.error(err);
} finally {
  await pool.end();
}