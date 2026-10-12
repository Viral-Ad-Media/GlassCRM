# GlassCRM

GlassCRM is a self-hosted CRM for one administrator workspace. It includes authenticated lead and deal management, a six-stage pipeline, reporting, CSV export, workspace settings, and a recent activity log. Records and sessions are stored in SQLite on the server.

The application starts with an empty workspace. It no longer presents fabricated business metrics, sample customers, or paid subscription promises.

## Requirements

- Node.js **22.13 or later**; Node.js 24 LTS is recommended and used in CI.
- npm and a writable persistent directory for SQLite.
- HTTPS and a Node-capable host for production.

## Local setup

```bash
git clone https://github.com/Viral-Ad-Media/GlassCRM.git
cd GlassCRM
npm ci
cp .env.example .env.local
```

Edit `.env.local`: set `CRM_ADMIN_EMAIL` and a unique `CRM_ADMIN_PASSWORD` containing 12–1024 characters. Keep the local origin at `http://localhost:3000` unless you also change the browser URL. No Gemini or other external API key is needed.

Start the API and frontend in separate terminals:

```bash
npm run dev:server
```

```bash
npm run dev
```

Open **http://localhost:3000**, then sign in with the administrator credentials. The Vite port is fixed at 3000; `/api` requests are proxied to the backend on port 3001. Both servers bind to loopback by default. Use the documented hostname consistently because cross-origin writes are rejected.

The administrator account is created only on the first start of a new database. Changing bootstrap environment values later does not change the stored account.

## Features

| Page              | Implemented behavior                                                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard         | Metrics and charts from saved deals; 7/30/365-day reporting periods; accessible text equivalents for chart data                                                             |
| Leads             | Create, edit, delete, search, status filtering, pagination at 20 leads per page, and CSV export of all filtered leads                                                       |
| Pipeline          | Create, edit, delete, desktop drag and drop, keyboard/touch stage selectors, exact currency formatting, and totals for New, Qualified, Proposal, Negotiation, Won, and Lost |
| Settings          | Persist workspace name, support email, and Light/Dark/System appearance                                                                                                     |
| Capabilities      | Describes the installed features without unsupported plan, payment, or SSO claims                                                                                           |
| Header/navigation | Search leads/deals, create a lead, review the last 50 activity entries, mobile navigation, and working sign-out                                                             |

Deleting a lead with linked deals is blocked until those deals are removed. The application confirms destructive deletion and displays validation/server errors. Reloading, switching pages, or restarting the server preserves saved records and settings.

Dashboard won value and win rate use closed deals' **most recent update timestamps** within the selected period; they are not accounting reports or immutable historical snapshots. Revenue dates are grouped in UTC. Current lead, open-deal, and stage counts are independent of the reporting period. Won/Lost stage selectors set probability to 100%/0%; probability remains editable in the deal editor.

CSV exports neutralize formula-like text and escape quotes. Exported files contain customer information; share them only with authorized people.

## Configuration

| Variable             | Purpose                                                                             |
| -------------------- | ----------------------------------------------------------------------------------- |
| `CRM_ADMIN_EMAIL`    | Administrator email for first-time database initialization                          |
| `CRM_ADMIN_PASSWORD` | Initial password, or the new password when running the reset command                |
| `CRM_ORIGIN`         | Exact browser origin, without a trailing slash; required HTTPS origin in production |
| `CRM_DB_PATH`        | SQLite path; defaults to `data/crm.sqlite`                                          |
| `CRM_HOST`           | Server bind address; defaults to `127.0.0.1`                                        |
| `PORT`               | Backend port; defaults to `3001`                                                    |
| `NODE_ENV`           | Set to `production` for HTTPS-only cookies and serving the built frontend           |

`.env` files and SQLite files are ignored by Git; `.env.example` intentionally contains no password. Private credentials are never injected into Vite's browser bundle.

### Password recovery/rotation

Set `CRM_ADMIN_PASSWORD` to a new password in your environment and use the same `CRM_DB_PATH` as the running installation:

```bash
npm run admin:reset-password
```

For local `.env.local` values:

```bash
node --env-file=.env.local --import tsx server/reset-password.ts
```

This updates the administrator password, revokes every existing session, and records a workspace activity entry. It does not erase CRM data. Bootstrap email values are not an account-editing mechanism.

## Production deployment

**This version requires the Node backend. Static-only hosting of `dist/` is insufficient.** Existing static/Vercel deployments require a backend/persistent-storage deployment change before using these workflows.

```bash
npm ci
npm run build
```

Build-time dependencies are required for `npm run build`; if your host sets `NODE_ENV=production` during installation, use `npm ci --include=dev`. The `tsx` backend runner is a runtime dependency.

Configure the host's environment:

```text
NODE_ENV=production
CRM_ORIGIN=https://your-crm.example.com
CRM_HOST=0.0.0.0
PORT=3001
CRM_DB_PATH=/your-persistent-volume/crm.sqlite
CRM_ADMIN_EMAIL=your-admin@example.com
CRM_ADMIN_PASSWORD=<unique password for initial setup>
```

Then run:

```bash
npm start
```

Terminate TLS at the hosting platform/reverse proxy and route the entire public origin to this process. The server serves `dist/` and `/api` from the same origin. Keep its internal HTTP port private. `GET /api/health` is available for health checks.

Use **one server instance with one persistent database**. This implementation does not coordinate writes across multiple application replicas or provide multi-user/organization tenancy. Protect the database directory and backups with host filesystem permissions. To create a consistent file backup, stop the process and copy the database together with any remaining SQLite WAL/SHM files; restore to the configured `CRM_DB_PATH` before starting again. Do not place the database in `dist/` or an ephemeral deployment filesystem.

Production responses include a Content Security Policy, frame protection, content-type protection, and HSTS. Frontend CSS, fonts, and scripts are local; no runtime Tailwind, Google Fonts, avatar service, or CDN import map is required. HashRouter routes such as `/#/leads` do not require server rewrite rules.

`npm run preview` previews frontend assets only. It is not the production server and does not provide the authenticated API.

## Commands and validation

| Command                                   | Purpose                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| `npm run dev`                             | Vite frontend on port 3000                                                           |
| `npm run dev:server`                      | Backend using `.env.local`                                                           |
| `npm start`                               | Backend using the host environment; serves the frontend when `NODE_ENV=production`   |
| `npm run typecheck`                       | Strict TypeScript checks, including unused declarations and unchecked indexed access |
| `npm run lint`                            | ESLint and React Hook checks                                                         |
| `npm run build`                           | Typecheck and build the frontend                                                     |
| `npm test`                                | Build, then run schema, persistence, API security, and production-serving tests      |
| `npm run test:e2e`                        | Playwright browser regression workflow                                               |
| `npm run check`                           | Lint and the build/test suite                                                        |
| `npm run format` / `npm run format:check` | Apply or check Prettier formatting                                                   |
| `npm run admin:reset-password`            | Rotate the administrator password and revoke sessions                                |

Install the browser before running Playwright:

```bash
npx playwright install chromium
npm run test:e2e
```

The browser test starts its own frontend/API servers and a separate test database, using test credentials. Ports 3000/3001 must be available. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` optionally selects a locally installed Chromium executable in environments where browser downloads are unavailable.

GitHub Actions uses Node 24 and `npm ci`, then checks formatting, lint, strict types, builds, API/storage tests, dependency advisories, and the browser workflow.

## Architecture

```text
App.tsx                    Lazy routes and responsive application shell
workspace.tsx              Authenticated session and shared workspace state
shared.ts                  Zod schemas, shared types, stages, and reporting helpers
index.css                  Locally compiled Tailwind 4 styles
components/                Navigation, record editor, reusable UI
pages/                     Dashboard, leads, pipeline, settings, capabilities
server/index.ts            Authenticated HTTP API and production static serving
server/store.ts            SQLite records, sessions, administrator, and activity log
server/password.ts         Salted scrypt password hashing and verification
server/reset-password.ts   Administrative password rotation
tests/                    Storage, validation, API, production, and browser tests
.github/workflows/ci.yml    Automated checks
```

## Security model and service boundaries

There is one administrator account and one workspace. Every CRM API operation requires a valid server-side session. Passwords are salted and hashed with scrypt. Session tokens are random; only token hashes are stored in the database. Cookies are HttpOnly and SameSite=Strict, and additionally Secure in production. Sessions expire after eight hours and are revoked by sign-out or password rotation.

State-changing requests require the configured Origin, preventing cross-site writes. JSON bodies are limited to 32 KB, schemas reject unknown fields and invalid record values, and login attempts are throttled per socket IP. The server deliberately does not trust forwarded IP headers; a reverse proxy may therefore group requests under its own IP. Use host-level rate controls as appropriate for your deployment.

Support email is workspace metadata. **No email is sent.** Activity is a recent workspace change log, not an external notification service or tamper-proof compliance audit trail. Checkout/subscriptions, SSO/SAML, team memberships, email delivery, and managed support are not implemented or advertised as available. Adding those services requires actual provider configuration and a separate integration.

## October 2026 audit remediation

| Original finding                                                         | Resolution                                                                                                   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Sample-only data, inert CRM controls, and state loss                     | Authenticated SQLite API; validated lead/deal CRUD; search, filter, CSV, settings, and persisted stage moves |
| Missing authentication/access checks                                     | Single-administrator login and server-enforced session authorization                                         |
| Client-side API-key injection and secret ignore gaps                     | Key replacement configuration removed; environment and database ignore rules added                           |
| Sidebar offset and mobile layout                                         | Matching 16rem desktop offset, responsive drawer/header, and scrollable tables/pipeline                      |
| Chart height and pipeline overflow                                       | Explicit 320px chart containers; vertically scrollable deal columns                                          |
| Missing stylesheet and runtime CDN dependencies                          | Local Tailwind 4 CSS build; obsolete stylesheet link, import map, external fonts, and avatar removed         |
| Missing React declarations, permissive checks, lockfile, tests, lint, CI | React types, strict checks, lockfile, regression tests, ESLint, formatting, and GitHub Actions               |
| Unnamed controls and inaccessible dragging                               | Labeled controls, associated form labels, native modal dialogs, focus styles, and stage selectors            |
| Currency rounding, stale drag state/timestamps, missing Lost stage       | Cent precision, drag-end cleanup, server-generated update timestamps, and Lost column                        |
| Eager pages/large chunk                                                  | Lazy page imports and separate chart chunk; generated chunks stay below the prior 500 KB warning             |
| Independent sample metrics and invisible totals                          | Shared persisted data, reporting filters, displayed stage totals, and documented metric semantics            |
| Unsupported billing/notification claims                                  | Honest capabilities page; removed inert pricing and email toggles                                            |

Validation during remediation passed strict type checking, lint, unit/API/production tests, and a Chromium browser workflow covering login, CRUD, stage changes, export, persistence, themes, mobile navigation, and sign-out. Dependency scanning reported zero known advisories in the committed lockfile. Hosted deployment and external payment/email services were not exercised.
