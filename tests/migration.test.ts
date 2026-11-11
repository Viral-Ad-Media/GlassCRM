import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { scryptSync, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { join } from "node:path";
import { database, testSecret } from "./helpers.js";
import { Store } from "../server/store.js";
test("legacy import preserves password, IDs, records, timestamps and settings; reruns are idempotent", async () => {
  const db = await database();
  const filename = join(db.dir, "legacy.sqlite");
  const source = new DatabaseSync(filename);
  const password = "Legacy-password-123";
  const salt = "a".repeat(32);
  const leadId = randomUUID();
  const dealId = randomUUID();
  const timestamp = "2026-01-02T03:04:05.000Z";
  source.exec(
    "CREATE TABLE admin(id INTEGER PRIMARY KEY,email TEXT,password TEXT); CREATE TABLE records(id TEXT PRIMARY KEY,kind TEXT,data TEXT); CREATE TABLE events(id TEXT PRIMARY KEY,action TEXT,timestamp TEXT)",
  );
  source
    .prepare("INSERT INTO admin VALUES(1,?,?)")
    .run(
      "legacy@example.com",
      `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
    );
  const lead = {
    id: leadId,
    name: "Legacy Alice",
    company: "Acme",
    email: "alice@example.com",
    status: "Qualified",
    value: 99.95,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const deal = {
    id: dealId,
    leadId,
    title: "Legacy deal",
    stageId: "won",
    probability: 100,
    value: 99.95,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  source
    .prepare("INSERT INTO records VALUES(?,?,?)")
    .run(leadId, "leads", JSON.stringify(lead));
  source
    .prepare("INSERT INTO records VALUES(?,?,?)")
    .run(dealId, "deals", JSON.stringify(deal));
  source.prepare("INSERT INTO records VALUES(?,?,?)").run(
    "settings",
    "settings",
    JSON.stringify({
      workspaceName: "Legacy workspace",
      supportEmail: "",
      appearance: "dark",
    }),
  );
  const runImport = async () => {
    const child = spawn(
      process.execPath,
      ["--import", "tsx", "server/import-sqlite.ts"],
      {
        env: {
          ...process.env,
          CRM_SQLITE_PATH: filename,
          DATABASE_URL: db.connectionString,
          BETTER_AUTH_SECRET: testSecret,
          CRM_ORIGIN: "http://localhost:3000",
        },
        stdio: "ignore",
      },
    );
    const [code] = await once(child, "exit");
    return code;
  };
  try {
    assert.equal(await runImport(), 0);
    assert.equal(await runImport(), 0);
    const store = new Store(db.pool);
    const snapshot = await store.snapshot();
    assert.deepEqual(snapshot.leads, [lead]);
    assert.deepEqual(snapshot.deals, [deal]);
    assert.equal(snapshot.settings.workspaceName, "Legacy workspace");
    const session = await db.auth.api.signInEmail({
      body: { email: "legacy@example.com", password },
      headers: new Headers({
        Origin: "http://localhost:3000",
        "x-glasscrm-client-ip": "127.0.0.1",
      }),
    });
    assert.ok(await store.authorize(session.user.id));
    source
      .prepare("UPDATE records SET data=? WHERE id=?")
      .run(JSON.stringify({ ...lead, name: "Changed source" }), leadId);
    assert.equal(await runImport(), 1);
    assert.equal((await store.snapshot()).leads[0]?.name, "Legacy Alice");
    assert.equal(
      source.prepare("SELECT count(*) AS count FROM records").get()?.count,
      3,
    );
  } finally {
    source.close();
    await db.close();
  }
});
