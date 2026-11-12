import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { database, testSecret } from "./helpers.js";
import { provisionSuperadmin } from "../server/superadmin.js";
import { bootstrap } from "../server/bootstrap.js";
import type { SuperadminOverview } from "../shared.js";

test("superadmin endpoints enforce roles, bound sessions, redact credentials and preserve the current session", async () => {
  const db = await database();
  const origin = "http://localhost:3221";
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "server/index.ts"],
    {
      env: {
        ...process.env,
        PORT: "3221",
        CRM_ORIGIN: origin,
        CRM_ADMIN_EMAIL: "owner@example.com",
        CRM_ADMIN_PASSWORD: "owner-test-password",
        DATABASE_URL: db.connectionString,
        BETTER_AUTH_SECRET: testSecret,
        NODE_ENV: "test",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let cookie = "";
  const request = (
    path: string,
    method = "GET",
    data?: unknown,
    allowedOrigin = origin,
  ) =>
    fetch(`${origin}/api/${path}`, {
      method,
      headers: {
        Origin: allowedOrigin,
        Cookie: cookie,
        "Content-Type": "application/json",
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  const cookies = (response: Response) =>
    response.headers
      .getSetCookie()
      .map((v) => v.split(";")[0])
      .join("; ");
  const login = (email: string, password: string, rememberMe: boolean) =>
    request("auth/sign-in/email", "POST", { email, password, rememberMe });
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Startup timeout")),
        15000,
      );
      child.stdout.on("data", (chunk) => {
        if (String(chunk).includes("listening")) {
          clearTimeout(timeout);
          resolve();
        }
      });
      child.once("exit", (code) => {
        clearTimeout(timeout);
        reject(new Error(`Server exited ${code}`));
      });
    });
    assert.equal((await request("superadmin")).status, 401);
    const remembered = await login(
      "owner@example.com",
      "owner-test-password",
      true,
    );
    assert.equal(remembered.status, 200);
    const persistentCookie = remembered.headers
      .getSetCookie()
      .find((v) => v.includes("session_token="))!;
    assert.match(persistentCookie, /Max-Age=28800/i);
    assert.match(persistentCookie, /HttpOnly/);
    cookie = cookies(remembered);
    const ownerCookie = cookie;
    const owner = (
      await db.pool.query<{ id: string }>(
        'SELECT id FROM "user" WHERE email=$1',
        ["owner@example.com"],
      )
    ).rows[0]!.id;
    const temporary = await login(
      "owner@example.com",
      "owner-test-password",
      false,
    );
    const sessionCookie = temporary.headers
      .getSetCookie()
      .find((v) => v.includes("session_token="))!;
    assert.doesNotMatch(sessionCookie, /Max-Age=|Expires=/i);
    const temporaryCookie = cookies(temporary);
    const durations = await db.pool.query<{ seconds: number }>(
      'SELECT extract(epoch FROM ("expiresAt"-"createdAt"))::float AS seconds FROM session',
    );
    for (const row of durations.rows) assert.ok(row.seconds <= 8 * 3600 + 1);
    assert.equal((await request("superadmin?page=0")).status, 400);
    const overview = await request("superadmin");
    assert.equal(overview.status, 200);
    const data = (await overview.json()) as SuperadminOverview;
    assert.equal(data.currentUserId, owner);
    assert.equal(data.totals.superadmins, 1);
    assert.equal(data.users[0]!.role, "superadmin");
    assert.equal(data.totals.activeSessions, 2);
    assert.doesNotMatch(JSON.stringify(data), /password|token|secret/i);
    assert.equal(
      (
        await request(
          "superadmin/sessions/revoke",
          "POST",
          { userId: owner },
          "https://evil.example",
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await request("superadmin/sessions/revoke", "POST", {
          userId: owner,
          role: "superadmin",
        })
      ).status,
      400,
    );
    let revoked = await request("superadmin/sessions/revoke", "POST", {
      userId: owner,
    });
    assert.equal(revoked.status, 200);
    assert.equal((await revoked.json()).revoked, 1);
    assert.equal((await request("workspace")).status, 200);
    cookie = temporaryCookie;
    assert.equal((await request("workspace")).status, 401);
    cookie = ownerCookie;
    const hash = await hashPassword("restricted-test-password");
    await db.pool.query(
      'INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,$2,$3,false,now(),now())',
      ["outsider", "Outside user", "outside@example.com"],
    );
    await db.pool.query(
      'INSERT INTO account(id,"accountId","providerId","userId",password,"createdAt","updatedAt") VALUES($1,$2,$3,$2,$4,now(),now())',
      ["outsider-credentials", "outsider", "credential", hash],
    );
    const outsider = await login(
      "outside@example.com",
      "restricted-test-password",
      true,
    );
    assert.equal(outsider.status, 200);
    cookie = cookies(outsider);
    const outsiderCookie = cookie;
    assert.equal((await request("superadmin")).status, 403);
    assert.equal(
      (await request("superadmin/sessions/revoke", "POST", { userId: owner }))
        .status,
      403,
    );
    assert.equal((await request("workspace")).status, 403);
    cookie = ownerCookie;
    revoked = await request("superadmin/sessions/revoke", "POST", {
      userId: "outsider",
    });
    assert.equal((await revoked.json()).revoked, 1);
    cookie = outsiderCookie;
    assert.equal((await request("workspace")).status, 401);
    cookie = ownerCookie;
    await db.pool.query(
      `INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") SELECT 'fixture-'||n,'Directory user '||n,'fixture'||n||'@example.com',false,now(),now() FROM generate_series(1,26) n`,
    );
    const first = (await (
      await request("superadmin")
    ).json()) as SuperadminOverview;
    const second = (await (
      await request("superadmin?page=2")
    ).json()) as SuperadminOverview;
    assert.equal(first.users.length, 25);
    assert.equal(second.users.length, 3);
    assert.equal(second.userPages, 2);
    assert.equal(first.totals.users, 28);
    await db.pool.query("DELETE FROM crm_superadmins WHERE user_id=$1", [
      owner,
    ]);
    assert.equal((await request("superadmin")).status, 403);
    assert.equal((await request("workspace")).status, 200);
    await bootstrap(db.pool);
    assert.equal((await request("superadmin")).status, 403);
    const id = await provisionSuperadmin(db.pool, {
      email: "OWNER@example.com",
      name: "Luqman",
      password: "new-owner-test-password",
    });
    assert.equal(id, owner);
    assert.equal((await request("workspace")).status, 401);
    assert.equal(
      (await login("owner@example.com", "owner-test-password", true)).status,
      401,
    );
    const updated = await login(
      "owner@example.com",
      "new-owner-test-password",
      true,
    );
    assert.equal(updated.status, 200);
    cookie = cookies(updated);
    const profile = await (await request("session")).json();
    assert.equal(profile.name, "Luqman");
    assert.equal(profile.role, "superadmin");
    const stored = await db.pool.query<{ password: string }>(
      'SELECT password FROM account WHERE "userId"=$1 AND "providerId"=$2',
      [owner, "credential"],
    );
    assert.ok(
      await verifyPassword({
        hash: stored.rows[0]!.password,
        password: "new-owner-test-password",
      }),
    );
    assert.equal(
      (await db.pool.query("SELECT user_id FROM crm_administrator")).rows[0]
        .user_id,
      owner,
    );
  } finally {
    child.kill("SIGTERM");
    await once(child, "exit");
    await db.close();
  }
});
