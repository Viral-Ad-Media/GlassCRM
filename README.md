# GlassCRM

GlassCRM is a React and TypeScript CRM interface prototype with a dashboard, a draggable sales pipeline, a sample leads table, and settings and pricing screens.

**Current status:** frontend demo. All business data comes from `constants.ts`. There is no backend, database, authentication, authorization, payment integration, or persistent storage. Use sample data for demonstrations; production CRM workflows still need implementation.

## Technology

- React 19 and React DOM
- React Router 7 with `HashRouter`
- Vite 6 and the React Vite plugin
- TypeScript 5.8
- Recharts for dashboard charts
- Lucide React for icons
- Tailwind CSS loaded at runtime from a CDN
- Google Fonts (Inter) and an external sample avatar

## Local development

Use a maintained Node.js LTS release compatible with the installed toolchain; Node.js 22.12+ is a suitable baseline. The audit used Node.js 24.19.0 and npm 11.9.0.

```bash
git clone https://github.com/Viral-Ad-Media/GlassCRM.git
cd GlassCRM
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:3000`. If that port is occupied, Vite can choose another port. The development server is configured to bind to `0.0.0.0`; use `npm run dev -- --host 127.0.0.1` when access should be limited to your computer.

The repository currently has no lockfile, so use `npm install` rather than `npm ci`. Commit a reviewed lockfile before relying on reproducible installs or CI.

### Environment variables

**No API key is required to run the current demo.** There are no Gemini calls or other API requests in the application code.

`vite.config.ts` contains unused replacements for `process.env.API_KEY` and `process.env.GEMINI_API_KEY`, sourced from `GEMINI_API_KEY`. If client code references these expressions, Vite can embed the value in the public bundle. Remove this configuration before adding integrations; keep private credentials on a server.

The ignore rules cover `*.local`, but do not explicitly cover `.env` or all environment-file variants. Do not commit credentials.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Generate the static production output in `dist/` |
| `npm run preview` | Preview the built output locally |

There are no configured test, lint, or typecheck scripts. For a separate check with the existing configuration, run `npx --no-install tsc --noEmit` after installing dependencies. Vite's build transpiles TypeScript and does not replace type checking.

## Pages and behavior

Hash-based routes appear as `/#/pipeline`, for example.

| Route | What currently works | Limitations |
| --- | --- | --- |
| `/#/` | Dashboard metrics and revenue/pipeline charts render sample values | Metrics are hardcoded; chart period buttons have no handlers; charts do not reflect pipeline changes |
| `/#/pipeline` | Desktop drag and drop moves sample deals among New, Qualified, Proposal, Negotiation, and Won | State is local to this page and resets on navigation away or reload; there is no keyboard/touch alternative or persistence |
| `/#/leads` | Displays five sample leads with company, status, value, and email | Filter, Export, and row action buttons are placeholders; no create/edit/delete flow |
| `/#/settings` | Displays editable fields and notification checkboxes | Save Changes does not save; appearance choices are decorative; no email delivery |
| `/#/billing` | Displays sample Starter, Pro, and Business pricing | No checkout, subscription management, SSO, audit logs, or implemented plan enforcement |

Sidebar navigation works. Header search, notifications, New, and profile actions are placeholders. Sign Out has no handler because there is no session system. Unknown routes redirect to the dashboard.

## Project structure

```text
App.tsx                    Router and application layout
index.tsx                  React entry point
index.html                 HTML shell, CDN styling, fonts, and import map
constants.ts               Sample user, leads, deals, stages, and chart data
types.ts                   CRM data interfaces
components/
  Header.tsx               Page title and placeholder global actions
  Sidebar.tsx              Navigation and placeholder sign-out action
  ui/Button.tsx            Shared button component
  ui/Card.tsx              Shared card component
pages/
  Dashboard.tsx            Sample metrics and charts
  Pipeline.tsx             Page-local drag-and-drop deal board
  Leads.tsx                Sample leads table
  Settings.tsx             Settings mockup
  Billing.tsx              Pricing mockup
vite.config.ts             Vite server, React plugin, aliases, and unused key definitions
tsconfig.json              TypeScript compiler configuration
metadata.json              App description and frame permission metadata
```

## Build and deployment

```bash
npm run build
npm run preview
```

Deploy `dist/` to a static hosting service. For a Vite deployment, use `npm run build` as the build command and `dist` as the output directory. HashRouter keeps client routes in the URL fragment, so these routes do not require server-side path rewrites.

The repository does not contain hosting configuration or deployment workflows. Existing hosting settings and live deployment behavior were not verified during this review.

The current output still relies on external Tailwind runtime styling, Google Fonts, and the avatar service. Bundle CSS locally before production use. `index.html` also references `/index.css`, which does not exist in this repository.

## Repository audit — October 6, 2026

Reviewed all 20 tracked files at source commit `a07cbf0ac00a27274cd1558a1ac2103ecbe7766e`. Findings below describe the source before this documentation update; application code was not changed.

### Prioritized findings

| Priority | Finding and evidence | Recommended action |
| --- | --- | --- |
| High | CRM operations are incomplete: pages use sample constants, pipeline state resets, and most action controls have no handlers (`pages/*`, `components/Header.tsx`, `components/Sidebar.tsx`) | Clearly label the demo and implement validated CRUD, persistence, settings, and integrations before using it for business operations |
| High | No authentication or authorization exists (`App.tsx` exposes every route and the current user is a constant) | Before connecting customer data, add sessions and server-enforced user/workspace access checks |
| Medium | Unused Gemini definitions create a future client-side credential exposure path (`vite.config.ts:13–16`); environment files are not comprehensively ignored | Remove unused key definitions, ignore secret-bearing environment files, and call private APIs from a server. No active key use was found |
| Medium | Sidebar width is `w-64` (16rem), but content uses `ml-60` (15rem); both remain fixed on small screens (`App.tsx:15`, `components/Sidebar.tsx:18`) | Align desktop dimensions and add responsive navigation and header layouts |
| Medium | Chart cards apply flex sizing to the outer Card, but Card inserts a non-flex inner wrapper (`components/ui/Card.tsx:11–14`, `pages/Dashboard.tsx`) | Give chart content a definite height/flex layout so percentage-height ResponsiveContainers can size reliably; confirm with browser tests |
| Medium | Pipeline hides vertical overflow and has no scrolling column list (`pages/Pipeline.tsx:37–38,46,63`) | Add bounded, vertically scrollable deal columns so additional cards remain reachable |
| Medium | Styling depends on the runtime Tailwind CDN; HTML references missing `/index.css` and retains a separate CDN import map (`index.html`) | Compile Tailwind/CSS locally, remove the broken stylesheet reference, and remove the unused import map from the Vite build |
| Medium | No lockfile, tests, linting, or CI; React declaration packages are missing and TypeScript strict checking is disabled (`package.json`, `tsconfig.json`) | Add React/React DOM types, strict type checking, a lockfile, and CI covering routing, deal movement, persistence, and completed actions |
| Medium | Icon-only controls lack accessible names; settings text labels are not associated with inputs; deal movement relies on dragging (`components/Header.tsx`, `pages/Leads.tsx`, `pages/Settings.tsx`, `pages/Pipeline.tsx`) | Add accessible names and input associations, keyboard focus states, and an accessible stage selector |
| Low | Currency is rounded to three significant digits; cancelled drags do not clear the dragged ID; stage moves do not update `updatedAt`; `lost` exists in the type but has no column (`pages/Pipeline.tsx`, `types.ts`, `constants.ts`) | Preserve currency precision, clear drag state on drag end, maintain timestamps, and define the intended Lost-stage behavior |
| Low | All pages and charts are eagerly imported; the generated JavaScript chunk was approximately 675 KB minified (`App.tsx`) | Split routes/chart code and measure load performance |
| Low | Dashboard periods, totals, and pipeline counts are independent sample values; column totals are calculated but not displayed (`pages/Dashboard.tsx`, `constants.ts`, `pages/Pipeline.tsx`) | Derive metrics from a shared data source and implement period filtering |

High-priority items are production-readiness gaps. This review did not demonstrate an active credential leak or access to real customer data.

### Validation results

| Check | Result |
| --- | --- |
| `npm install --ignore-scripts --no-audit --no-fund` | Passed |
| `npm run build` | Passed; warned about missing `/index.css` and a chunk over 500 KB |
| `npx --no-install tsc --noEmit` | Passed with the repository's permissive configuration |
| `npx --no-install tsc --noEmit --noImplicitAny` | Failed: missing React declarations, missing JSX types, and implicit-any diagnostics |
| `npm audit --json` | Zero reported vulnerabilities for the freshly resolved dependency graph |

The dependency check used Vite 6.4.4, React/React DOM 19.3.0, React Router 7.18.4, Recharts 3.10.1, and TypeScript 5.8.3. Without a committed lockfile, another installation may resolve different versions. The generated local lockfile was used for validation only and was not committed.

Validation covered source review, compilation, type checking, and dependency scanning. No browser, end-to-end, production deployment, backend, or payment tests were performed. A passing build or dependency scan does not establish production readiness.
