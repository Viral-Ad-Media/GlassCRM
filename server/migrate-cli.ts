import { runtime } from "./runtime.js";
import { migrate } from "./migrate.js";
const { pool, auth } = runtime();
try {
  await migrate(pool, auth);
  console.log("Database schema is ready");
} finally {
  await pool.end();
}
