import { hashPassword } from "better-auth/crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { database, testSecret } from "./helpers.js";
import { once } from "node:events";
import type { Snapshot } from "../shared.js";
test("API protects data, validates mutations, rejects cross-origin writes, and revokes logout sessions", async () => {
  const db = await database();
  const origin = "http://localhost:3219";
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "server/index.ts"],
    {
      env: {
        ...process.env,
        PORT: "3219",
        CRM_ORIGIN: origin,
        CRM_ADMIN_EMAIL: "admin@example.com",
        CRM_ADMIN_PASSWORD: "testing-password-123",
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
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Server startup timeout")),
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
    assert.equal((await request("workspace")).status, 401);
    assert.equal(
      (
        await request("auth/sign-in/email", "POST", {
          email: "admin@example.com",
          password: "wrong",
        })
      ).status,
      401,
    );
    const login = await request("auth/sign-in/email", "POST", {
      email: "admin@example.com",
      password: "testing-password-123",
    });
    assert.equal(login.status, 200);
    cookie = login.headers
      .getSetCookie()
      .map((value) => value.split(";")[0]!)
      .join("; ");
    assert.match(login.headers.get("set-cookie")!, /HttpOnly/);
    assert.match(login.headers.get("set-cookie")!, /SameSite=Strict/);
    assert.equal((await request("workspace")).status, 200);
    assert.equal(
      (
        await request("auth/sign-up/email", "POST", {
          name: "Intruder",
          email: "other@example.com",
          password: "intruder-password-123",
        })
      ).status,
      400,
    );
    assert.equal(
      Number(
        (await db.pool.query('SELECT count(*) FROM "user"')).rows[0].count,
      ),
      1,
    );
    const restrictedHash = await hashPassword("restricted-user-password");
    await db.pool.query(
      'INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt") VALUES($1,$2,$3,false,now(),now())',
      ["restricted-user", "Restricted", "restricted@example.com"],
    );
    await db.pool.query(
      'INSERT INTO account(id,"accountId","providerId","userId",password,"createdAt","updatedAt") VALUES($1,$2,$3,$2,$4,now(),now())',
      ["restricted-account", "restricted-user", "credential", restrictedHash],
    );
    const administratorCookie = cookie;
    const restrictedLogin = await request("auth/sign-in/email", "POST", {
      email: "restricted@example.com",
      password: "restricted-user-password",
    });
    assert.equal(restrictedLogin.status, 200);
    cookie = restrictedLogin.headers
      .getSetCookie()
      .map((value) => value.split(";")[0]!)
      .join("; ");
    assert.equal((await request("workspace")).status, 403);
    cookie = administratorCookie;
    const lead = {
      name: "API Alice",
      company: "Acme",
      email: "a@example.com",
      status: "New",
      value: 12.34,
    };
    assert.equal(
      (await request("leads", "POST", lead, "https://evil.example")).status,
      403,
    );
    assert.equal(
      (await request("leads", "POST", { ...lead, value: -1 })).status,
      400,
    );
    let response = await request("leads", "POST", lead);
    assert.equal(response.status, 200);
    let snapshot = (await response.json()) as Snapshot;
    const leadId = snapshot.leads[0]!.id;
    response = await request("deals", "POST", {
      title: "Test deal",
      leadId,
      value: 12.34,
      probability: 20,
      stageId: "new",
    });
    assert.equal(response.status, 200);
    snapshot = (await response.json()) as Snapshot;
    const dealId = snapshot.deals[0]!.id;
    assert.equal((await request(`leads/${leadId}`, "DELETE")).status, 400);
    response = await request(`deals/${dealId}`, "PUT", {
      title: "Test deal",
      leadId,
      value: 12.34,
      probability: 100,
      stageId: "won",
    });
    assert.equal(response.status, 200);
    assert.equal((await request(`deals/${dealId}`, "DELETE")).status, 200);
    assert.equal((await request(`leads/${leadId}`, "DELETE")).status, 200);
    assert.equal((await request("auth/sign-out", "POST", {})).status, 200);
    assert.equal((await request("workspace")).status, 401);
    const beforeReset = await request("auth/sign-in/email", "POST", {
      email: "admin@example.com",
      password: "testing-password-123",
    });
    cookie = beforeReset.headers
      .getSetCookie()
      .map((value) => value.split(";")[0]!)
      .join("; ");
    const reset = spawn(
      process.execPath,
      ["--import", "tsx", "server/reset-password.ts"],
      {
        env: {
          ...process.env,
          DATABASE_URL: db.connectionString,
          BETTER_AUTH_SECRET: testSecret,
          CRM_ADMIN_PASSWORD: "rotated-test-password",
        },
        stdio: "ignore",
      },
    );
    const [resetCode] = await once(reset, "exit");
    assert.equal(resetCode, 0);
    assert.equal((await request("workspace")).status, 401);
    assert.equal(
      (
        await request("auth/sign-in/email", "POST", {
          email: "admin@example.com",
          password: "testing-password-123",
        })
      ).status,
      401,
    );
    const afterReset = await request("auth/sign-in/email", "POST", {
      email: "admin@example.com",
      password: "rotated-test-password",
    });
    assert.equal(afterReset.status, 200);
    cookie = afterReset.headers
      .getSetCookie()
      .map((value) => value.split(";")[0]!)
      .join("; ");
    assert.equal((await request("auth/sign-out", "POST", {})).status, 200);
    await db.pool.query('DELETE FROM "rateLimit"');
    for (let i = 0; i < 10; i++)
      assert.equal(
        (
          await request("auth/sign-in/email", "POST", {
            email: "admin@example.com",
            password: "bad",
          })
        ).status,
        401,
      );
    assert.equal(
      (
        await request("auth/sign-in/email", "POST", {
          email: "admin@example.com",
          password: "bad",
        })
      ).status,
      429,
    );
  } catch (error) {
    console.error("API assertion failed", error);
    throw error;
  } finally {
    child.kill("SIGTERM");
    await once(child, "exit");
    await db.close();
  }
});
