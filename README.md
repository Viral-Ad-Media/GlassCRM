# GlassCRM

GlassCRM is a self-hosted CRM for one administrator workspace, built with React, TypeScript, Node.js, **Neon PostgreSQL**, and **Better Auth**. Leads, deals, settings, activity, users, sessions, and login throttling all live in PostgreSQL. No runtime SQLite database or Render disk is required.

## Local setup

Requirements: Node.js 24, npm, and a PostgreSQL connection string. Neon pooled connections are supported; use a separate Neon development branch for local work.

```bash
npm ci
cp .env.example .env.local
```

Set these server-only values in `.env.local`:

| Variable             | Purpose                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------- |
| `DATABASE_URL`       | Neon PostgreSQL connection URL with `sslmode=verify-full`                               |
| `BETTER_AUTH_SECRET` | Stable random secret of at least 32 characters; generate with `openssl rand -base64 48` |
| `CRM_ADMIN_EMAIL`    | Administrator email used only to initialize an empty workspace                          |
| `CRM_ADMIN_PASSWORD` | Initial administrator password, 12–1024 characters                                      |
| `CRM_ORIGIN`         | Exact browser origin, no trailing slash; locally `http://localhost:3000`                |
| `CRM_HOST`           | API bind address; defaults to `127.0.0.1`                                               |
| `PORT`               | API port; defaults to `3001`                                                            |

Start the backend and frontend in separate terminals:

```bash
npm run dev:server
```

```bash
npm run dev
```

Open **http://localhost:3000**. Vite proxies `/api` to the backend on port 3001. Use the configured hostname consistently: write requests from other origins are rejected. The backend applies additive schema migrations before accepting connections, then creates the administrator only if one does not already exist.

`.env` files are ignored by Git. Never prefix `DATABASE_URL`, `BETTER_AUTH_SECRET`, or administrator credentials with `VITE_`; these values belong only on the server. No Gemini key is needed.

## Authentication and access

The app runs **self-managed Better Auth on the Node server**, backed by Neon PostgreSQL. This is not a separate Neon Managed Auth service. It uses the official Better Auth React client, Node adapter, and PostgreSQL adapter.

Public signup is disabled. Creating a Better Auth user alone does not grant CRM access: every CRM API request also checks the single-administrator membership in `crm_administrator`. The app remains one workspace, with no public registration, team tenancy, or implicit promotion by email.

Sessions last eight hours. Session cookies are HttpOnly and SameSite=Strict, plus Secure in production. Session cookie caching is disabled so sign-out and administrator password resets revoke access immediately. Better Auth owns credential hashing, signed cookies, session records, and the database-backed rate limiter. Incoming IP headers are overwritten from the socket address before reaching Better Auth, preventing browser-spoofed headers from bypassing throttling. Behind Render's proxy, requests may share a conservative login-rate bucket.

Auth endpoints live under `/api/auth/`, including `/sign-in/email`, `/get-session`, and `/sign-out`. The frontend uses `auth-client.ts`; it no longer calls the removed custom `/api/login` or `/api/logout` endpoints.

### Password rotation/recovery

Changing the bootstrap password variable does not change an existing account. To rotate an existing administrator's password, set `CRM_ADMIN_PASSWORD` to the desired new value and run against the intended database:

```bash
npm run admin:reset-password
```

For local configuration:

```bash
node --env-file=.env.local --import tsx server/reset-password.ts
```

This updates the Better Auth credential account and revokes all sessions in the same transaction. The app does not send password-reset email; recovery is an administrator operation.

## Deploy on Render with Neon

Deploy one **Node web service** from this repository. The service serves the built frontend and API from one origin.

- Build command: `npm ci --include=dev && npm run build`
- Start command: `npm start`
- Runtime: Node 24
- Region: Virginia, near the Neon database in AWS us-east-1
- Health endpoint: `/api/health`
- Persistent Render disk: unnecessary

Set `NODE_ENV=production`, `CRM_HOST=0.0.0.0`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `CRM_ADMIN_EMAIL`, and `CRM_ADMIN_PASSWORD` in Render's Environment settings. Keep secrets stable across deploys. The initial password must be set before the first start of a fresh database; subsequent starts leave the existing account unchanged.

Render injects `RENDER_EXTERNAL_URL`; when `CRM_ORIGIN` is unset, the backend uses this as its exact public origin. For a custom domain, explicitly set `CRM_ORIGIN=https://your-domain.example`. Keep the app, API, and Better Auth on that same HTTPS origin. TLS is also required for the production database connection.

The optional `render.yaml` template declares the same service, with secret prompts and a generated Better Auth secret. Directly created Render services use their Dashboard configuration until a Blueprint is explicitly connected. The runtime uses Render's assigned `PORT`.

Startup applies Better Auth's generated PostgreSQL schema and `migrations/001-crm.sql`, using a transaction-scoped advisory lock compatible with Neon pooling. Schema changes complete before the HTTP listener starts. `npm run db:migrate` applies the same migrations explicitly. Run database-changing commands only with the intended branch's URL.

`GET /api/health` confirms that startup completed and the process is serving requests; it deliberately avoids continuously polling or waking Neon. Production responses include CSP, frame protection, content-type protection, and HSTS. Shutdown drains HTTP requests and closes PostgreSQL connections.

Static-only hosting of `dist/` cannot provide the authenticated API. Existing Vercel/static deployments must be pointed to the new full-stack service or migrated separately.

## Import an existing SQLite workspace

The importer preserves administrator email/password, lead/deal IDs, timestamps, settings, and activity. It opens the source read-only and imports everything in one PostgreSQL transaction. A failed import leaves the destination workspace unchanged. Repeating the exact same import is a no-op. It refuses to overwrite a populated target workspace.

1. Stop writes to the old installation and take a consistent SQLite backup, including any WAL state. Keep that source backup available for rollback.
2. Configure the **empty target** Neon branch's `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `CRM_ORIGIN`.
3. Set `CRM_SQLITE_PATH` to the existing SQLite file and run the import **before starting the new server**:

```bash
CRM_SQLITE_PATH=/absolute/path/to/crm.sqlite npm run db:import-sqlite
```

For variables in `.env.local`:

```bash
node --env-file=.env.local --import tsx server/import-sqlite.ts
```

4. Start the new service and verify records and login with the existing administrator password.
5. Keep the old installation stopped during cutover; do not direct writes to both databases.

Legacy scrypt hashes are explicitly prefixed during import and verified through Better Auth's custom password-verification extension. New passwords use Better Auth's default hashing. Existing sessions are not transferred; users sign in again. Importing into a service that has already bootstrapped a new administrator is deliberately blocked.

No legacy database is bundled with this repository. A fresh deployment begins empty unless an operator imports a source database first.

## CRM workflows

| Page         | Available behavior                                                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard    | Reports from saved records, 7/30/365-day periods, chart data in accessible text                                                                |
| Leads        | Create, edit, delete, search, filter by status, 20-per-page pagination, filtered CSV export                                                    |
| Pipeline     | Create, edit, delete, drag/drop or keyboard/touch stage selection; exact currency; New, Qualified, Proposal, Negotiation, Won, and Lost totals |
| Settings     | Saved workspace name, support email, Light/Dark/System appearance                                                                              |
| Capabilities | Describes installed services without unsupported paid-plan claims                                                                              |
| Navigation   | Search, New lead, recent activity, mobile navigation, sign-out                                                                                 |

Foreign keys prevent deleting a lead that still has deals. Record changes and activity writes are transactional. Records survive page changes, server restarts, and Render deploys because they live in Neon. CSV exports neutralize formula-like text and escape quotes.

Revenue and win rate use closed deals' most recent update timestamps in the reporting period; they are not immutable accounting records. Revenue dates are grouped in UTC. Lead/open-deal/stage counts reflect the current workspace. Support email is metadata: email delivery, checkout, subscriptions, SSO/SAML, managed support, and multiple teams are not included.

## Commands and tests

| Command                        | Purpose                                                       |
| ------------------------------ | ------------------------------------------------------------- |
| `npm run dev`                  | Vite on port 3000                                             |
| `npm run dev:server`           | Backend with `.env.local`                                     |
| `npm start`                    | Backend using the process environment                         |
| `npm run db:migrate`           | Additive PostgreSQL/Better Auth schema migration              |
| `npm run db:import-sqlite`     | Read-only-source legacy workspace import                      |
| `npm run admin:reset-password` | Password rotation and session revocation                      |
| `npm run typecheck`            | Strict TypeScript checks                                      |
| `npm run lint`                 | ESLint and React Hook checks                                  |
| `npm run format:check`         | Formatting validation                                         |
| `npm run build`                | Typecheck and Vite production build                           |
| `npm test`                     | Build, then API/storage/migration/production regression tests |
| `npm run test:e2e`             | Chromium UI regression workflow                               |
| `npm run check`                | Lint plus build and regression tests                          |

The lockfile upgrades Zod and Vite to patched releases. A root `minimatch` override selects the patched 11.x release while the lint toolchain still requests vulnerable older majors. Lint and browser/build checks validate this override.

Tests launch isolated, temporary **real PostgreSQL instances** using the development-only `embedded-postgres` package, with generated local TLS certificates. They do not use a production Neon URL. OpenSSL and an unprivileged OS user are needed; GitHub Actions provides both. Test databases and processes are cleaned up after each suite. No production user/data cleanup is performed.

For browser tests:

```bash
npx playwright install chromium
npm run test:e2e
```

The browser test starts its own frontend, API, and PostgreSQL instance. Ports 3000 and 3001 must be available. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` optionally selects an existing browser binary when downloads are unavailable.

Coverage includes disabled public signup, server-side administrator authorization, login throttling, CSRF protection, logout/password-reset revocation, CRUD, foreign-key safeguards, transaction rollback, legacy-password import, migration idempotency, production static serving/TLS cookies, and the mobile/desktop browser workflow. GitHub Actions checks formatting, lint, types, build, tests, dependencies, and Chromium.

## Architecture

```text
App.tsx                    Lazy routes and application shell
workspace.tsx              Shared authenticated workspace state
auth-client.ts             Better Auth React client
shared.ts                  Validation schemas, types, stages, reporting helpers
components/ and pages/     CRM interface
server/auth.ts             Better Auth configuration and legacy password verifier
server/database.ts         PostgreSQL pool and transaction helper
server/store.ts            CRM persistence and access checks
server/migrate.ts          Better Auth + CRM schema initialization
server/bootstrap.ts        First administrator creation
server/index.ts            HTTP API and production assets
server/import-sqlite.ts    One-time legacy migration
server/reset-password.ts   Administrator password recovery
migrations/001-crm.sql     CRM tables, indexes, and foreign keys
render.yaml                Optional Render deployment template
```
