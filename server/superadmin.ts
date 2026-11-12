import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import type { Pool } from "pg";
import { z } from "zod";
import { transaction } from "./database.js";
import type { SuperadminOverview, SuperadminUser } from "../shared.js";

export const superadminInput = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((value) => value.trim().toLowerCase()),
    name: z.string().trim().min(1).max(200),
    password: z.string().min(12).max(1024),
  })
  .strict();

// Explicit operator action only. Migrations never promote existing accounts.
export async function provisionSuperadmin(
  pool: Pool,
  input: z.input<typeof superadminInput>,
) {
  const { email, name, password } = superadminInput.parse(input);
  const hash = await hashPassword(password);
  return transaction(pool, async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(62449753)");
    const existing = await client.query<{ id: string }>(
      'SELECT id FROM "user" WHERE lower(email)=$1 FOR UPDATE',
      [email],
    );
    const id = existing.rows[0]?.id ?? randomUUID();
    if (existing.rowCount)
      await client.query(
        'UPDATE "user" SET name=$1,"updatedAt"=now() WHERE id=$2',
        [name, id],
      );
    else
      await client.query(
        'INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,$2,$3,false,now(),now())',
        [id, name, email],
      );
    const credentials = await client.query(
      'UPDATE account SET password=$1,"updatedAt"=now() WHERE "userId"=$2 AND "providerId"=$3',
      [hash, id, "credential"],
    );
    if (!credentials.rowCount)
      await client.query(
        'INSERT INTO account(id,"accountId","providerId","userId",password,"createdAt","updatedAt") VALUES($1,$2,$3,$2,$4,now(),now())',
        [randomUUID(), id, "credential", hash],
      );
    await client.query(
      "INSERT INTO crm_superadmins(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING",
      [id],
    );
    await client.query('DELETE FROM session WHERE "userId"=$1', [id]);
    await client.query(
      "INSERT INTO crm_events(id,action,timestamp) VALUES($1,$2,now())",
      [
        randomUUID(),
        `Provisioned superadmin ${email}; previous sessions revoked`,
      ],
    );
    return id;
  });
}

export class SuperadminStore {
  constructor(readonly pool: Pool) {}
  async overview(
    currentUserId: string,
    page: number,
  ): Promise<SuperadminOverview> {
    // One statement yields consistent counts and a bounded directory. Never return auth credentials or session tokens.
    const { rows } = await this.pool.query<{ data: SuperadminOverview }>(
      `
      WITH totals AS (SELECT
        (SELECT count(*)::int FROM "user") AS users,
        (SELECT count(*)::int FROM crm_superadmins) AS superadmins,
        (SELECT count(*)::int FROM session WHERE "expiresAt">now()) AS active_sessions,
        (SELECT count(*)::int FROM crm_leads) AS leads,
        (SELECT count(*)::int FROM crm_deals) AS deals),
      paging AS (SELECT greatest(1,ceil(users/25.0)::int) AS pages FROM totals),
      directory AS (SELECT u.id,u.name,u.email,u."createdAt" AS "createdAt",
        CASE WHEN s.user_id IS NOT NULL THEN 'superadmin' WHEN a.user_id IS NOT NULL THEN 'administrator' ELSE 'none' END AS role,
        (SELECT count(*)::int FROM session x WHERE x."userId"=u.id AND x."expiresAt">now()) AS "activeSessions",
        (SELECT max(x."updatedAt") FROM session x WHERE x."userId"=u.id AND x."expiresAt">now()) AS "lastActiveAt"
        FROM "user" u LEFT JOIN crm_superadmins s ON s.user_id=u.id LEFT JOIN crm_administrator a ON a.user_id=u.id
        ORDER BY u."createdAt",u.id LIMIT 25 OFFSET ((least($2,(SELECT pages FROM paging))-1)*25)),
      recent_events AS (SELECT id,action,timestamp FROM crm_events ORDER BY timestamp DESC,id DESC LIMIT 20)
      SELECT jsonb_build_object(
        'generatedAt',now(),'currentUserId',$1::text,
        'workspace',jsonb_build_object('name',(SELECT data->>'workspaceName' FROM crm_settings WHERE id=1),'supportEmail',(SELECT data->>'supportEmail' FROM crm_settings WHERE id=1),'mode','single-workspace'),
        'health',jsonb_build_object('database','connected','authentication','Better Auth'),
        'totals',jsonb_build_object('users',users,'superadmins',superadmins,'activeSessions',active_sessions,'leads',leads,'deals',deals),
        'users',COALESCE((SELECT jsonb_agg(to_jsonb(directory)) FROM directory),'[]'::jsonb),
        'userPage',least($2,(SELECT pages FROM paging)),'userPages',(SELECT pages FROM paging),
        'events',COALESCE((SELECT jsonb_agg(to_jsonb(recent_events)) FROM recent_events),'[]'::jsonb)
      ) AS data FROM totals`,
      [currentUserId, page],
    );
    return rows[0]!.data;
  }
  async revokeSessions(
    actorId: string,
    targetId: string,
    currentSessionId: string,
  ) {
    return transaction(this.pool, async (client) => {
      const user = await client.query<Pick<SuperadminUser, "email">>(
        'SELECT email FROM "user" WHERE id=$1 FOR UPDATE',
        [targetId],
      );
      if (!user.rowCount) throw new Error("Record not found");
      const result = await client.query(
        'DELETE FROM session WHERE "userId"=$1 AND id<>$2',
        [targetId, currentSessionId],
      );
      await client.query(
        "INSERT INTO crm_events(id,action,timestamp) VALUES($1,$2,now())",
        [
          randomUUID(),
          `Superadmin ${actorId} revoked ${result.rowCount} session(s) for ${user.rows[0]!.email}`,
        ],
      );
      return { revoked: result.rowCount ?? 0 };
    });
  }
}
