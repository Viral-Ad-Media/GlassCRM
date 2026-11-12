# GlassCRM UI/UX audit

Reviewed 12 November 2026 using [Hallmark v2.0.0](https://github.com/nutlope/hallmark). This change adds a public SaaS website and improves the existing private workspace. It does not implement tenant isolation.

## Findings and changes

| Finding                                                                  | Resolution                                                                                                                                   |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Root opened the private app with no public product or access explanation | Added static Home, Product, Pricing and Contact routes; moved the protected app to `/app` and preserved existing hash bookmarks              |
| Framework palette and system type lacked a shared identity               | Applied Coral-derived semantic color tokens, OFL Manrope, consistent spacing, and light/dark workspace roles                                 |
| Record actions had similar emphasis                                      | Kept creation prominent; made edit, cancel, export, pagination and sign-out quieter; delete uses the error role                              |
| Field edges lacked sufficient contrast                                   | Set form-control borders to the contrasting muted token; retained instant focus outlines                                                     |
| Motion lacked an explicit reduced-motion fallback                        | Added a global reduced-motion rule and limited button transitions to transforms                                                              |
| Lead rows and pipeline columns were hard to navigate on narrow screens   | Added named keyboard-scrollable regions, a sticky lead name column, and compact pipeline columns; retained mobile navigation and all actions |
| Initial hero capture hid stages; phone capture was too small             | Used actual board and column captures, plus a readable lead-editor capture for the mobile Product page                                       |
| Reporting sections described the product with too little visual evidence | Added real overview captures, explicitly labeled example data                                                                                |
| Initial pricing headline implied a decided price                         | Changed it to “Pricing is still taking shape”; no plans, checkout or prices are invented                                                     |
| Contact could imply an account request was submitted                     | Uses a real mailto action and explains that the visitor sends the draft themselves                                                           |

## Review and verification

Hallmark baseline: **3 Floor findings and 1 Reflex finding** in the previous app. The comparison retained **3/3 links, 13/13 fields and 21/21 handlers**. The rendered URL moved from `/` to `/app`; the automated URL comparison reports that mismatch, so the browser tests separately verify the legacy redirects and authenticated workflow.

The final app sweep reports **0 Floor and 0 Reflex findings**. Public-page sweeps run across desktop and phone renders, including 1280×800, 1440×900, 1920×1080 and 375px full pages. One recorded Reflex waiver accepts full-width factual FAQ rows instead of adding decorative imagery to thin sections. Near-budget copy warnings are retained as editorial review notes rather than claimed as a perfect score.

Independent hero review resolved stage visibility and mobile legibility. Its suggestions for a more distinctive headline and greater typographic mass remain subjective brand refinements. The independent finish review resolved product fold placement, reporting imagery, mobile detail captures, action-specific copy and pricing clarity. Its remaining hero word-budget concern prompted a tighter actual board capture, removing repeated app headings and instructions while keeping all six stages.

Verification includes production static-route and security-header tests; browser checks with JavaScript disabled; public-page API-request isolation; mobile menu and FAQ behavior; legacy-link preservation; and the existing authenticated lead/deal CRUD, CSV, persistence, settings, charts and mobile navigation workflow. Tests use temporary local PostgreSQL and example records, never the production database.

## Scope and material

No published prices, testimonials, customer logos or performance claims were supplied. None are invented. Marketing uses only the existing product and explicitly describes the private preview. Public registration, organizations, tenant-scoped authorization, memberships, billing and subscription limits remain future backend work.

Image slots are real captures: a 1536px-wide pipeline board, a 248px pipeline-column detail, a 1440px lead list captured at 2×, a 512px lead editor, and an 1184px overview. The most useful next brand input is an approved customer-specific positioning statement; approved public pricing is required before replacing the preview pricing page.
