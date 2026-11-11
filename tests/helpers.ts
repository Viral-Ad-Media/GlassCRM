import EmbeddedPostgres from "embedded-postgres";
import { mkdtemp, rm, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomInt } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Pool } from "pg";
import { createAuth } from "../server/auth.js";
import { migrate } from "../server/migrate.js";
export const testSecret =
  "GlassCRM-test-only-secret-not-for-production-123456789";
export async function database() {
  const dir = await mkdtemp(join(tmpdir(), "glasscrm-test-"));
  const port = randomInt(18000, 50000);
  const cert = join(dir, "cert.pem");
  const key = join(dir, "key.pem");
  await promisify(execFile)("openssl", [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-keyout",
    key,
    "-out",
    cert,
    "-subj",
    "/CN=localhost",
    "-addext",
    "subjectAltName=DNS:localhost,IP:127.0.0.1",
    "-days",
    "1",
  ]);
  await chmod(key, 0o600);
  const pg = new EmbeddedPostgres({
    databaseDir: join(dir, "pg"),
    user: "postgres",
    password: "local-test-only",
    port,
    persistent: false,
    onLog: () => {},
    onError: (message) => {
      if (String(message).includes("FATAL")) console.error(message);
    },
    postgresFlags: [
      "-c",
      "unix_socket_directories=",
      "-c",
      "listen_addresses=127.0.0.1",
      "-c",
      "ssl=on",
      "-c",
      `ssl_cert_file=${cert}`,
      "-c",
      `ssl_key_file=${key}`,
    ],
  });
  try {
    await pg.initialise();
    await pg.start();
  } catch (error) {
    await rm(dir, { recursive: true, force: true });
    throw error;
  }
  const connectionString = `postgresql://postgres:local-test-only@127.0.0.1:${port}/postgres?sslmode=verify-full&sslrootcert=${encodeURIComponent(cert)}`;
  let closing = false;
  const errors: Error[] = [];
  const pool = new Pool({ connectionString, max: 5 });
  pool.on("error", (error) => {
    if (!closing) errors.push(error);
  });
  const auth = createAuth(pool, "http://localhost:3000", testSecret);
  await migrate(pool, auth);
  return {
    dir,
    connectionString,
    pool,
    auth,
    close: async () => {
      closing = true;
      await pool.end();
      await pg.stop();
      await rm(dir, { recursive: true, force: true });
      if (errors.length) throw errors[0];
    },
  };
}
