import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { readFileSync, statSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { z } from "zod";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { Store } from "./store.js";
import { runtime } from "./runtime.js";
import { migrate } from "./migrate.js";
import { bootstrap } from "./bootstrap.js";
import { leadInput, dealInput, settingsInput } from "../shared.js";
const production = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT ?? 3001);
const { pool, auth, origin } = runtime();
await migrate(pool, auth);
await bootstrap(pool);
const store = new Store(pool);
const handleAuth = toNodeHandler(auth);
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
const dist = resolve("dist");
const server = createServer(async (req, res) => {
  // Never trust a browser-supplied forwarding header for login throttling.
  req.headers["x-glasscrm-client-ip"] = req.socket.remoteAddress ?? "127.0.0.1";
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
      const routes: Record<string, string> = {
        "/": "/index.html",
        "/app": "/app.html",
        "/app/": "/app.html",
        "/product": "/product/index.html",
        "/product/": "/product/index.html",
        "/pricing": "/pricing/index.html",
        "/pricing/": "/pricing/index.html",
        "/contact": "/contact/index.html",
        "/contact/": "/contact/index.html",
      };
      const target = resolve(
        dist,
        `.${decodeURIComponent(routes[pathname] ?? pathname)}`,
      );
      if (
        pathname === "/app" ||
        pathname === "/app/" ||
        pathname === "/app.html"
      )
        res.setHeader("X-Robots-Tag", "noindex, nofollow");
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
        ".woff2": "font/woff2",
        ".xml": "application/xml",
        ".txt": "text/plain",
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
    if (pathname.startsWith("/api/auth/")) {
      if (Number(req.headers["content-length"] ?? 0) > 32768)
        return send(res, 413, { error: "Request too large" });
      await handleAuth(req, res);
      return;
    }
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) return send(res, 401, { error: "Please sign in" });
    if (!(await store.authorize(session.user.id)))
      return send(res, 403, {
        error: "Workspace access is restricted to its administrator",
      });
    if (pathname === "/api/session" && req.method === "GET")
      return send(res, 200, { email: session.user.email });
    if (pathname === "/api/workspace" && req.method === "GET")
      return send(res, 200, await store.snapshot());
    if (pathname === "/api/settings" && req.method === "PUT") {
      await store.settings(settingsInput.parse(await body(req)));
      return send(res, 200, await store.snapshot());
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
        await store.save(kind, data, id);
        return send(res, 200, await store.snapshot());
      }
      if (req.method === "DELETE" && id) {
        await store.remove(kind, id);
        return send(res, 200, await store.snapshot());
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

let closing = false;
const shutdown = () => {
  if (closing) return;
  closing = true;
  server.close(() => {
    void pool.end().then(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
