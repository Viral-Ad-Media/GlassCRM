import { runtime } from "./runtime.js";
import { migrate } from "./migrate.js";
import { provisionSuperadmin } from "./superadmin.js";
const { pool, auth } = runtime();
try {
  await migrate(pool, auth);
  await provisionSuperadmin(pool, {
    email: process.env.CRM_SUPERADMIN_EMAIL ?? "",
    name: process.env.CRM_SUPERADMIN_NAME ?? "",
    password: process.env.CRM_SUPERADMIN_PASSWORD ?? "",
  });
  console.log("Superadmin provisioned; previous sessions revoked");
} finally {
  await pool.end();
}
