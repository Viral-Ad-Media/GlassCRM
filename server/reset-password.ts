import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { Store } from "./store.js";
import { passwordHash } from "./password.js";
const filename = resolve(process.env.CRM_DB_PATH ?? "data/crm.sqlite");
if (!existsSync(filename))
  throw new Error("Database does not exist; start the server first");
const password = process.env.CRM_ADMIN_PASSWORD;
if (!password) throw new Error("Set CRM_ADMIN_PASSWORD to the new password");
const hash = passwordHash(password);
const store = new Store(filename);
try {
  if (!store.db.prepare("SELECT id FROM admin WHERE id=1").get())
    throw new Error("Administrator account does not exist");
  store.db.exec("BEGIN IMMEDIATE");
  try {
    store.db.prepare("UPDATE admin SET password=? WHERE id=1").run(hash);
    store.db.exec("DELETE FROM sessions");
    store.event("Administrator password reset; all sessions revoked");
    store.db.exec("COMMIT");
  } catch (error) {
    store.db.exec("ROLLBACK");
    throw error;
  }
  console.log("Administrator password updated; all sessions revoked");
} finally {
  store.db.close();
}
