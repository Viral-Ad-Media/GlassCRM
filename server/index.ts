import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomBytes, createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync } from "node:fs";
import { resolve, extname, sep, dirname } from "node:path";
import { z } from "zod";
import { Store } from "./store.js";
import { passwordHash, passwordMatches } from "./password.js";
import { leadInput, dealInput, settingsInput } from "../shared.js";
const production = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT ?? 3001);
const origin =
  process.env.CRM_ORIGIN ?? (production ? "" : "http://localhost:3000");
if (
  !origin ||
  new URL(origin).origin !== origin ||
  (production && !origin.startsWith("https://"))
)
  throw new Error(
    "CRM_ORIGIN must be an exact origin with no trailing slash; HTTPS is required in production",
  );
const filename = resolve(process.env.CRM_DB_PATH ?? "data/crm.sqlite");
mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
const store = new Store(filename);
const email = process.env.CRM_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.CRM_ADMIN_PASSWORD;
if (!store.db.prepare("SELECT id FROM admin WHERE id=1").get()) {
  if (
    !email ||
    !z.email().safeParse(email).success ||
    !password ||
    password.length < 12
  )
    throw new Error(
      "Initial setup requires CRM_ADMIN_EMAIL and CRM_ADMIN_PASSWORD (at least 12 characters)",
    );
  store.db
    .prepare("INSERT INTO admin VALUES (1, ?, ?)")
    .run(email, passwordHash(password));
}
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const attempts = new Map<string, { count: number; until: number }>();
function send(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(value));
}
async function body(req: IncomingMessage) {
  if (!req.headers["content-type"]?.startsWith("application/json"))
    throw new Error("JSON required");
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32768) throw new Error("Request too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}
const cookie = (token: string, age: number) =>
  `glasscrm_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${production ? "; Secure" : ""}`;
const dist = resolve("dist");
const server = createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  );
  if (production)
    res.setHeader("Strict-Transport-Security", "max-age=31536000");
  try {
    const pathname = new URL(req.url ?? "/", origin).pathname;
    if (!pathname.startsWith("/api/")) {
      if (!production)
        return send(res, 404, { error: "Use the Vite frontend on port 3000" });
      if (req.method !== "GET" && req.method !== "HEAD")
        return send(res, 405, { error: "Method not allowed" });
      const target = resolve(
        dist,
        `.${decodeURIComponent(pathname === "/" ? "/index.html" : pathname)}`,
      );
      if (
        !target.startsWith(dist + sep) ||
        !statSync(target, { throwIfNoEntry: false })?.isFile()
      )
        return send(res, 404, { error: "Not found" });
      const mime: Record<string, string> = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".png": "image/png",
      };
      res.writeHead(200, {
        "Content-Type": mime[extname(target)] ?? "application/octet-stream",
        "Cache-Control": pathname.startsWith("/assets/")
          ? "public, max-age=31536000, immutable"
          : "no-cache",
      });
      return res.end(req.method === "HEAD" ? undefined : readFileSync(target));
    }
    if (pathname === "/api/health" && req.method === "GET")
      return send(res, 200, { ok: true });
    if (req.method !== "GET" && req.headers.origin !== origin)
      return send(res, 403, { error: "Invalid request origin" });
    if (pathname === "/api/login" && req.method === "POST") {
      const now = Date.now();
      for (const [key, entry] of attempts)
        if (entry.until < now) attempts.delete(key);
      const ip = req.socket.remoteAddress ?? "unknown";
      if (attempts.size >= 10000 && !attempts.has(ip))
        return send(res, 429, {
          error: "Login temporarily unavailable. Try again later.",
        });
      const entry = attempts.get(ip) ?? { count: 0, until: now + 900000 };
      if (entry.count >= 10)
        return send(res, 429, {
          error: "Too many login attempts. Try again in 15 minutes.",
        });
      entry.count++;
      attempts.set(ip, entry);
      const input = z
        .object({ email: z.string().max(254), password: z.string().max(1024) })
        .strict()
        .parse(await body(req));
      const admin = store.db
        .prepare("SELECT email, password FROM admin WHERE id=1")
        .get() as { email: string; password: string };
      const validPassword = passwordMatches(input.password, admin.password);
      if (!validPassword || input.email.trim().toLowerCase() !== admin.email)
        return send(res, 401, { error: "Invalid email or password" });
      attempts.delete(ip);
      const token = randomBytes(32).toString("hex");
      store.db.prepare("DELETE FROM sessions WHERE expires < ?").run(now);
      store.db
        .prepare("INSERT INTO sessions VALUES (?, ?)")
        .run(hash(token), now + 8 * 3600000);
      res.setHeader("Set-Cookie", cookie(token, 8 * 3600));
      return send(res, 200, { email: admin.email });
    }
    const token =
      req.headers.cookie
        ?.split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("glasscrm_session="))
        ?.slice("glasscrm_session=".length) ?? "";
    if (
      !/^[a-f0-9]{64}$/.test(token) ||
      !store.db
        .prepare("SELECT hash FROM sessions WHERE hash=? AND expires>?")
        .get(hash(token), Date.now())
    )
      return send(res, 401, { error: "Please sign in" });
    if (pathname === "/api/logout" && req.method === "POST") {
      store.db.prepare("DELETE FROM sessions WHERE hash=?").run(hash(token));
      res.setHeader("Set-Cookie", cookie("", 0));
      return send(res, 200, { ok: true });
    }
    if (pathname === "/api/session" && req.method === "GET")
      return send(
        res,
        200,
        store.db.prepare("SELECT email FROM admin WHERE id=1").get(),
      );
    if (pathname === "/api/workspace" && req.method === "GET")
      return send(res, 200, store.snapshot());
    if (pathname === "/api/settings" && req.method === "PUT") {
      store.settings(settingsInput.parse(await body(req)));
      return send(res, 200, store.snapshot());
    }
    const match = pathname.match(
      /^\/api\/(leads|deals)(?:\/([a-f0-9-]{36}))?$/,
    );
    if (match) {
      const kind = match[1] as "leads" | "deals";
      const id = match[2];
      if ((req.method === "POST" && !id) || (req.method === "PUT" && id)) {
        const data = (kind === "leads" ? leadInput : dealInput).parse(
          await body(req),
        );
        store.save(kind, data, id);
        return send(res, 200, store.snapshot());
      }
      if (req.method === "DELETE" && id) {
        store.remove(kind, id);
        return send(res, 200, store.snapshot());
      }
    }
    return send(res, 404, { error: "Not found" });
  } catch (error) {
    if (error instanceof z.ZodError)
      return send(res, 400, {
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
    if (error instanceof SyntaxError)
      return send(res, 400, { error: "Invalid JSON" });
    const message = error instanceof Error ? error.message : "";
    if (
      [
        "Record not found",
        "Select an existing lead",
        "Delete linked deals before deleting this lead",
        "JSON required",
        "Request too large",
      ].includes(message)
    )
      return send(res, message === "Record not found" ? 404 : 400, {
        error: message,
      });
    console.error("Request failed", error);
    return send(res, 500, { error: "Request failed. Try again." });
  }
});
server.requestTimeout = 15000;
server.headersTimeout = 15000;
server.maxHeadersCount = 64;
server.listen(port, process.env.CRM_HOST ?? "127.0.0.1", () =>
  console.log(`GlassCRM server listening on port ${port}`),
);
