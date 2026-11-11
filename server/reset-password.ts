import { hashPassword } from "better-auth/crypto";
import { runtime } from "./runtime.js";
import { transaction } from "./database.js";
const password = process.env.CRM_ADMIN_PASSWORD;
if (!password || password.length < 12 || password.length > 1024)
  throw new Error("Set a new 12–1024 character CRM_ADMIN_PASSWORD");
const { pool } = runtime();
try {
  const hash = await hashPassword(password);
  await transaction(pool, async (client) => {
    const admin = (
      await client.query<{ user_id: string }>(
        "SELECT user_id FROM crm_administrator WHERE id=1 FOR UPDATE",
      )
    ).rows[0];
    if (!admin) throw new Error("Administrator account does not exist");
    await client.query(
      'UPDATE account SET password=$1,"updatedAt"=now() WHERE "userId"=$2 AND "providerId"=$3',
      [hash, admin.user_id, "credential"],
    );
    await client.query('DELETE FROM session WHERE "userId"=$1', [
      admin.user_id,
    ]);
    await client.query(
      "INSERT INTO crm_events(id,action,timestamp) VALUES(gen_random_uuid(),$1,now())",
      ["Administrator password reset; all sessions revoked"],
    );
  });
  console.log("Administrator password updated; all sessions revoked");
} finally {
  await pool.end();
}
