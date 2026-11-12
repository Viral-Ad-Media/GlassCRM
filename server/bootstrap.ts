import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import type { Pool } from "pg";
import { z } from "zod";
import { transaction } from "./database.js";
export async function bootstrap(pool: Pool) {
  if ((await pool.query("SELECT 1 FROM crm_administrator WHERE id=1")).rowCount)
    return;
  const email = process.env.CRM_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.CRM_ADMIN_PASSWORD;
  if (
    !email ||
    !z.email().safeParse(email).success ||
    !password ||
    password.length < 12 ||
    password.length > 1024
  )
    throw new Error(
      "First start requires CRM_ADMIN_EMAIL and a 12–1024 character CRM_ADMIN_PASSWORD",
    );
  const hash = await hashPassword(password);
  await transaction(pool, async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(62449752)");
    if (
      (await client.query("SELECT 1 FROM crm_administrator WHERE id=1"))
        .rowCount
    )
      return;
    if (
      (
        await client.query('SELECT 1 FROM "user" WHERE lower(email)=$1', [
          email,
        ])
      ).rowCount
    )
      throw new Error(
        "Existing user requires explicit administrator migration",
      );
    const id = randomUUID();
    const now = new Date();
    await client.query(
      'INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,$2,$3,false,$4,$4)',
      [id, "Workspace administrator", email, now],
    );
    await client.query(
      'INSERT INTO account(id,"accountId","providerId","userId",password,"createdAt","updatedAt") VALUES($1,$2,$3,$2,$4,$5,$5)',
      [randomUUID(), id, "credential", hash, now],
    );
    await client.query(
      "INSERT INTO crm_administrator(id,user_id) VALUES(1,$1)",
      [id],
    );
    await client.query("INSERT INTO crm_superadmins(user_id) VALUES($1)", [id]);
  });
}
