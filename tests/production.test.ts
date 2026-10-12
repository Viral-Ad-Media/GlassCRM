import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
test("production serves bundled assets, adds security headers, and marks the session cookie secure", async () => {
  const dir = mkdtempSync(join(tmpdir(), "glasscrm-production-"));
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "server/index.ts"],
    {
      env: {
        ...process.env,
        PORT: "3220",
        CRM_ORIGIN: "https://crm.example.com",
        CRM_ADMIN_EMAIL: "admin@example.com",
        CRM_ADMIN_PASSWORD: "production-test-password",
        CRM_DB_PATH: join(dir, "test.sqlite"),
        NODE_ENV: "production",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
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
    const html = await fetch("http://localhost:3220/");
    assert.equal(html.status, 200);
    assert.match(
      html.headers.get("content-security-policy")!,
      /frame-ancestors 'none'/,
    );
    assert.match(html.headers.get("strict-transport-security")!, /max-age=/);
    const text = await html.text();
    const asset = text.match(/src="(\/assets\/[^"]+\.js)"/);
    assert.ok(asset);
    assert.equal((await fetch(`http://localhost:3220${asset[1]}`)).status, 200);
    assert.equal(
      (await fetch("http://localhost:3220/server/index.ts")).status,
      404,
    );
    const login = await fetch("http://localhost:3220/api/login", {
      method: "POST",
      headers: {
        Origin: "https://crm.example.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "admin@example.com",
        password: "production-test-password",
      }),
    });
    assert.equal(login.status, 200);
    assert.match(login.headers.get("set-cookie")!, /; Secure/);
  } finally {
    child.kill("SIGTERM");
    await once(child, "exit");
    rmSync(dir, { recursive: true, force: true });
  }
});
