import { readFile } from "node:fs/promises";
import { getMigrations } from "better-auth/db/migration";
import type { Pool } from "pg";
import type { Auth } from "./auth.js";
import { defaultSettings } from "../shared.js";
export async function migrate(pool: Pool, auth: Auth) {
  const lock = await pool.connect();
  try {
    await lock.query("BEGIN");
    try {
      await lock.query("SELECT pg_advisory_xact_lock(62449751)");
      const plan = await getMigrations(auth.options);
      const sql = await plan.compileMigrations();
      if (sql.trim()) await lock.query(sql);
      await lock.query(
        await readFile(
          new URL("../migrations/001-crm.sql", import.meta.url),
          "utf8",
        ),
      );
      await lock.query(
        "INSERT INTO crm_settings(id,data) VALUES(1,$1) ON CONFLICT(id) DO NOTHING",
        [defaultSettings],
      );
      await lock.query("COMMIT");
    } catch (error) {
      await lock.query("ROLLBACK");
      throw error;
    }
  } finally {
    lock.release();
  }
}
