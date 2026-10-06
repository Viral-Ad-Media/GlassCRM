import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import type { Snapshot } from "../shared.js";
test("API protects data, validates mutations, rejects cross-origin writes, and revokes logout sessions", async () => {
  const dir = mkdtempSync(join(tmpdir(), "glasscrm-api-"));
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
        CRM_DB_PATH: join(dir, "test.sqlite"),
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
        await request("login", "POST", {
          email: "admin@example.com",
          password: "wrong",
        })
      ).status,
      401,
    );
    const login = await request("login", "POST", {
      email: "admin@example.com",
      password: "testing-password-123",
    });
    assert.equal(login.status, 200);
    cookie = login.headers.get("set-cookie")!.split(";")[0]!;
    assert.match(login.headers.get("set-cookie")!, /HttpOnly/);
    assert.match(login.headers.get("set-cookie")!, /SameSite=Strict/);
    assert.equal((await request("workspace")).status, 200);
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
    assert.equal((await request("logout", "POST", {})).status, 200);
    assert.equal((await request("workspace")).status, 401);
    const beforeReset = await request("login", "POST", {
      email: "admin@example.com",
      password: "testing-password-123",
    });
    cookie = beforeReset.headers.get("set-cookie")!.split(";")[0]!;
    const reset = spawn(
      process.execPath,
      ["--import", "tsx", "server/reset-password.ts"],
      {
        env: {
          ...process.env,
          CRM_DB_PATH: join(dir, "test.sqlite"),
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
        await request("login", "POST", {
          email: "admin@example.com",
          password: "testing-password-123",
        })
      ).status,
      401,
    );
    const afterReset = await request("login", "POST", {
      email: "admin@example.com",
      password: "rotated-test-password",
    });
    assert.equal(afterReset.status, 200);
    cookie = afterReset.headers.get("set-cookie")!.split(";")[0]!;
    assert.equal((await request("logout", "POST", {})).status, 200);
    for (let i = 0; i < 10; i++)
      assert.equal(
        (
          await request("login", "POST", {
            email: "admin@example.com",
            password: "bad",
          })
        ).status,
        401,
      );
    assert.equal(
      (
        await request("login", "POST", {
          email: "admin@example.com",
          password: "bad",
        })
      ).status,
      429,
    );
  } finally {
    child.kill("SIGTERM");
    await once(child, "exit");
    rmSync(dir, { recursive: true, force: true });
  }
});
