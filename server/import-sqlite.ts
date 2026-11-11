import { DatabaseSync } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { runtime } from "./runtime.js";
import { migrate } from "./migrate.js";
import { transaction } from "./database.js";
import {
  leadInput,
  dealInput,
  settingsInput,
  type Lead,
  type Deal,
} from "../shared.js";
const filename = process.env.CRM_SQLITE_PATH;
if (!filename)
  throw new Error("Set CRM_SQLITE_PATH to an existing SQLite database");
// Read-only source: credentials, records and timestamps survive; sessions are deliberately not imported.
const source = new DatabaseSync(filename, { readOnly: true });
const { pool, auth } = runtime();
try {
  const admin = source
    .prepare("SELECT email,password FROM admin WHERE id=1")
    .get() as { email: string; password: string } | undefined;
  if (!admin || !/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(admin.password))
    throw new Error("Source administrator or password hash is invalid");
  const rows = source
    .prepare("SELECT id,kind,data FROM records ORDER BY id")
    .all() as { id: string; kind: string; data: string }[];
  const events = source
    .prepare("SELECT id,action,timestamp FROM events ORDER BY timestamp")
    .all() as { id: string; action: string; timestamp: string }[];
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ admin, rows, events }))
    .digest("hex");
  await migrate(pool, auth);
  await transaction(pool, async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(62449752)");
    if (
      (
        await client.query("SELECT 1 FROM crm_imports WHERE id=$1", [
          fingerprint,
        ])
      ).rowCount
    ) {
      console.log("This source was already imported; nothing changed");
      return;
    }
    if (
      (
        await client.query(
          "SELECT 1 FROM crm_administrator UNION ALL SELECT 1 FROM crm_leads UNION ALL SELECT 1 FROM crm_deals LIMIT 1",
        )
      ).rowCount
    )
      throw new Error(
        "Import requires an empty target workspace; no data was changed",
      );
    const id = randomUUID();
    const now = new Date();
    await client.query(
      'INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,$2,$3,false,$4,$4)',
      [id, "Workspace administrator", admin.email.trim().toLowerCase(), now],
    );
    await client.query(
      'INSERT INTO account(id,"accountId","providerId","userId",password,"createdAt","updatedAt") VALUES($1,$2,$3,$2,$4,$5,$5)',
      [randomUUID(), id, "credential", `legacy:${admin.password}`, now],
    );
    await client.query(
      "INSERT INTO crm_administrator(id,user_id) VALUES(1,$1)",
      [id],
    );
    for (const row of rows.filter((r) => r.kind === "leads")) {
      const data = JSON.parse(row.data) as Lead;
      leadInput.parse({
        name: data.name,
        company: data.company,
        email: data.email,
        status: data.status,
        value: data.value,
      });
      if (data.id !== row.id || !Number.isFinite(Date.parse(data.updatedAt)))
        throw new Error("Invalid source lead");
      await client.query(
        "INSERT INTO crm_leads(id,data,created_at) VALUES($1,$2,$3)",
        [data.id, data, data.createdAt],
      );
    }
    for (const row of rows.filter((r) => r.kind === "deals")) {
      const data = JSON.parse(row.data) as Deal;
      dealInput.parse({
        title: data.title,
        leadId: data.leadId,
        stageId: data.stageId,
        value: data.value,
        probability: data.probability,
      });
      if (data.id !== row.id || !Number.isFinite(Date.parse(data.updatedAt)))
        throw new Error("Invalid source deal");
      await client.query(
        "INSERT INTO crm_deals(id,lead_id,data,created_at) VALUES($1,$2,$3,$4)",
        [data.id, data.leadId, data, data.createdAt],
      );
    }
    const settings = rows.find((r) => r.kind === "settings");
    if (settings)
      await client.query("UPDATE crm_settings SET data=$1 WHERE id=1", [
        settingsInput.parse(JSON.parse(settings.data)),
      ]);
    for (const event of events)
      await client.query(
        "INSERT INTO crm_events(id,action,timestamp) VALUES($1,$2,$3)",
        [event.id, event.action, event.timestamp],
      );
    await client.query("INSERT INTO crm_imports(id) VALUES($1)", [fingerprint]);
    console.log(
      "SQLite workspace imported; sign in with the existing administrator password",
    );
  });
} finally {
  source.close();
  await pool.end();
}
