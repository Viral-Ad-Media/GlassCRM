import { spawn } from "node:child_process";
import { database, testSecret } from "./helpers.js";
const db = await database();
const server = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
  env: {
    ...process.env,
    DATABASE_URL: db.connectionString,
    BETTER_AUTH_SECRET: testSecret,
    CRM_ORIGIN: "http://127.0.0.1:3000",
    CRM_ADMIN_EMAIL: "browser@example.com",
    CRM_ADMIN_PASSWORD: "browser-test-password",
    PORT: "3001",
    NODE_ENV: "test",
  },
  stdio: "inherit",
});
let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  server.kill("SIGTERM");
  await new Promise<void>((resolve) => {
    if (server.exitCode !== null) resolve();
    else server.once("exit", () => resolve());
  });
  await db.close();
  process.exit(0);
};
process.on("SIGTERM", () => void stop());
process.on("SIGINT", () => void stop());
server.once("exit", () => {
  if (!stopping) void stop();
});
