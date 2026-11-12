# GlassCRM

GlassCRM is a self-hosted CRM for one administrator workspace, built with React, TypeScript, Node.js, **Neon PostgreSQL**, and **Better Auth**. Leads, deals, settings, activity, users, sessions, and login throttling all live in PostgreSQL. No runtime SQLite database or Render disk is required.

## Public website and workspace

The public website is prerendered HTML at `/`, `/product`, `/pricing`, and `/contact`. Navigation, FAQ disclosures, product images, and email links work without JavaScript. `/app` opens the authenticated CRM. Existing `/#/pipeline`, `/#/leads`, and other workspace bookmarks redirect to `/app` while preserving the hash destination.

Marketing pages use shared React templates in `marketing/`, rendered at build time by `scripts/prerender.tsx`. The public entry loads a small legacy-link redirect script rather than the CRM bundle. The protected app, Better Auth, and API authorization remain separate. The contact action opens a mail draft; it does not submit a form or provision an account.

`npm run build` produces the public pages, workspace bundle, sitemap, and robots file. Set `PUBLIC_SITE_URL` to the public origin when building for another host; otherwise `RENDER_EXTERNAL_URL` or `https://glasscrm.onrender.com` is used for canonical URLs. Never put credentials in this variable.

The SaaS marketing surface is ready for the next stage. The backend still has **one administrator workspace**. Tenant-scoped data and authorization, invitations, team roles, public registration, subscription enforcement, and payment processing must be implemented before offering a multi-tenant service. The public pages state these preview limits and publish no unapproved prices.

## UI and UX

The interface follows a shared warm-paper palette, self-hosted Manrope typography, visible keyboard focus, reduced-motion preferences, and quieter secondary and destructive actions. Static pages have mobile navigation, semantic landmarks, route metadata and canonical links. Product images are captures of the real app using isolated example records, with detail captures for phones. The workspace preserves every existing workflow and route.

See [the UI/UX audit](docs/UI_UX_AUDIT.md) for Hallmark findings and validation, and [design.md](design.md) for the design system. Font assets retain their [SIL Open Font License](public/fonts/OFL.txt).

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

Open **http://localhost:3000** for the public site and **http://localhost:3000/app** for the workspace. Vite proxies `/api` to the backend on port 3001. Use the configured hostname consistently: write requests from other origins are rejected. The backend applies additive schema migrations before accepting connections, then creates the administrator only if one does not already exist.

`.env` files are ignored by Git. Never prefix `DATABASE_URL`, `BETTER_AUTH_SECRET`, or administrator credentials with `VITE_`; these values belong only on the server. No Gemini key is needed.

## Authentication and access

The app runs **self-managed Better Auth on the Node server**, backed by Neon PostgreSQL. This is not a separate Neon Managed Auth service. It uses the official Better Auth React client, Node adapter, and PostgreSQL adapter.

Public signup is disabled. Creating a Better Auth user alone does not grant CRM access: every CRM API request also checks administrator membership in `crm_administrator` or an explicit platform grant in `crm_superadmins`. The app remains one workspace, with no public registration or team tenancy. Email matching alone never promotes an existing user.

The protected superadmin dashboard is at `/app#/superadmin`. It shows real account and session totals, a paginated user directory, workspace/database health and recent activity. Superadmin API routes require a database-backed role check on every request. Superadmins can revoke sessions for an account; the acting session is preserved and the action is recorded. Auth credential hashes, session tokens and secrets are never included in dashboard responses.

New installations grant their first bootstrap administrator the superadmin role. Existing accounts require explicit operator provisioning; a schema migration never grants the role.

Sessions last at most eight hours between refreshes. The sign-in form includes Show/Hide password and an unchecked-by-default Remember me option. Remembered sign-ins use a persistent cookie for up to eight hours; unchecked sign-ins use a browser-session cookie. Both modes are capped at eight hours on the server. Passwords are never saved in browser storage. Session cookies are HttpOnly and SameSite=Strict, plus Secure in production. Session cookie caching is disabled so sign-out and administrator password resets revoke access immediately. Better Auth owns credential hashing, signed cookies, session records, and the database-backed rate limiter. Incoming IP headers are overwritten from the socket address before reaching Better Auth, preventing browser-spoofed headers from bypassing throttling. Behind Render's proxy, requests may share a conservative login-rate bucket.

Auth endpoints live under `/api/auth/`, including `/sign-in/email`, `/get-session`, and `/sign-out`. The frontend uses `auth-client.ts`; it no longer calls the removed custom `/api/login` or `/api/logout` endpoints.

### Provision a superadmin

Run the operator command with server-only `DATABASE_URL`, `BETTER_AUTH_SECRET`, `CRM_SUPERADMIN_EMAIL`, `CRM_SUPERADMIN_NAME` and `CRM_SUPERADMIN_PASSWORD` supplied through your secure environment:

```bash
npm run admin:provision-superadmin
```

This explicit command creates the account if needed, or preserves its existing user ID and workspace membership. It sets the requested display name, hashes the supplied password using Better Auth, grants the superadmin role, revokes that account’s previous sessions and records the provisioning action. Repeating it deliberately resets the password again. The command does not print credentials. Do not run it as part of normal startup or place real credentials in source control.

## Password rotation/recovery

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
