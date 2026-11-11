import { createPool } from "./database.js";
import { createAuth } from "./auth.js";
export function runtime() {
  const origin =
    process.env.CRM_ORIGIN ??
    process.env.RENDER_EXTERNAL_URL ??
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
  if (
    !origin ||
    new URL(origin).origin !== origin ||
    (process.env.NODE_ENV === "production" && !origin.startsWith("https://"))
  )
    throw new Error("Configure an exact HTTPS CRM_ORIGIN in production");
  const pool = createPool();
  const auth = createAuth(pool, origin);
  return { pool, auth, origin };
}
