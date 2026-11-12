# Design: GlassCRM

## System

- Genre: modern-minimal.
- Theme: Coral, adapted for a sales CRM. Warm paper, dark ink, restrained coral states. Self-hosted Manrope (OFL) replaces General Sans so the repository can redistribute its font assets.
- Public page shape: product-led Banner followed by an actual pipeline capture, workflow rows and questions. No invented metrics, logos, prices or testimonials.
- Signature: the real six-stage sales pipeline, captured from a local workspace with labeled example data.
- Audience: small businesses evaluating a focused sales CRM.
- Job: request private-preview access; existing users can open their workspace.

## Tokens

`styles/tokens.css` is the single source of truth. Use role-based variables, never literal colors or font families outside tokens.

- Light paper: --color-paper, --color-paper-2, --color-paper-3, --color-cotton.
- Ink: --color-ink, --color-ink-2, --color-muted.
- Rules: --color-rule, --color-rule-2; fields use --color-muted for a visible edge.
- Signal: --color-accent, --color-accent-2, --color-focus.
- Type: --font-display and --font-body are Manrope; tabular figures use the same face.
- Scale: --space-3xs through --space-4xl, --text-display, --text-section, --text-title, --text-lead.
- Canvas: one capped container, --container: 1440px; --gutter steps 64/24/16px.

## Controls

- Primary: dark ink with paper text, 8px radius, 48px marketing height.
- Secondary: transparent or cotton with ink text, same radius and height.
- Existing app actions remain, using quieter secondary/destructive treatments.
- Instant keyboard focus; no opacity-hidden content; native details and forms where possible.

## Motion

Still by default. Short transform/opacity state transitions only, disabled under reduced motion. No ornamental entrance animations.

## Public page contract

Home, Product, Pricing, Contact. Plain anchors navigate static prerendered HTML; no authentication API runs on public pages. The protected workspace is /app with hash routes. Pricing and multi-workspace signup are not yet available; describe private preview truthfully. Primary marketing CTA is /contact; the contact page opens a real mailto draft to the existing business account viraladmediacontent@gmail.com. Never show a fake send confirmation.
Public components export a named component returning <main id="main-content">; shared header/footer are provided by MarketingSite. Use common classes from marketing/marketing.css, add page-only CSS in your own file if needed. No body/head elements and no client-side data fetching.

## Exports

styles/tokens.css; marketing/marketing.css; application index.css. Font files are the unmodified @fontsource-variable/manrope latin subset with its OFL license.

## Audit exceptions

- Native FAQ and factual workflow rows may form a short section without decorative imagery (Hallmark Reflex 77). Product/reporting imagery uses actual app captures.
- An editorial screen may run slightly above the approximate 80-word target; preserve accurate preview limitations and access instructions.
- Hero review: stage visibility and phone legibility resolved; distinctive positioning and headline mass remain brand refinements.
