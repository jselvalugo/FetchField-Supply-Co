# Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-09-24 | Logo: trail-blaze square with a ball above a chalk line; Archivo 800/112 wordmark, outlined | Works at 16px, reads as a painted blaze (spec §15) |
| 2026-09-24 | Keep the custom stack with a direct AliExpress DS API integration; no Shopify or third-party ERP in between | Owner confirmed. Full design control, no middleman holding our supplier credentials; partner ERPs (DSers, Syncee…) don't target custom storefronts |
| 2026-09-24 | Wrote our own AliExpress client instead of depending on the unofficial `ae_sdk` | Small, auditable surface for code that holds credentials; fewer supply-chain dependencies. Spec says wrap it; we replaced it |
| 2026-09-24 | Supplier credentials live only in `apps/worker`; the web app imports only the pure `pricing`, `delivery` and `public` subpaths of `@fetchfield/suppliers` | A compromised storefront can't reach supplier accounts |
| 2026-09-24 | Tailwind v4 (CSS-first `@theme`) generated from `packages/tokens/src/tokens.ts`, with the default color palette removed | Spec §4 says Tailwind config; v4 has no JS config by default. Removing defaults enforces "no ad-hoc colors" |
| 2026-09-24 | Added `--clay-action #A84F2B` and `--stone-ink #5F645C` | Brand clay on chalk is 3.6:1 and stone is 2.9:1, both below WCAG AA for text. The raw colors stay for non-text use. A test enforces this |
| 2026-09-24 | Component gallery lives in the pages themselves for now; no Storybook yet | Kept the build lean for the first pass. Storybook can wrap `packages/ui` without changes |
| 2026-09-24 | Photos: shot-list placeholders (`PhotoSlot`, marked `PLACEHOLDER-PHOTO`) | No licensed photography available yet, and AI images are banned (§3.5). Each placeholder carries the brief for the shoot |
| 2026-09-24 | Spec sheets are print-to-PDF pages, not stored PDFs | Always matches the live spec plate. Tagged PDFs are a known gap |
| 2026-09-24 | Fonts self-hosted via Fontsource, three weights site-wide (400/600/800) | No third-party font requests (privacy, CSP `font-src 'self'`); spec §3.5 weight limit |
| 2026-09-24 | Sample catalog behind a repository module, with a sitewide "sample data" notice | Honest while specs and prices are unconfirmed; Medusa swaps in at one file |
| 2026-09-24 | Order placement is never auto-retried after an unknown outcome | The DS API has no idempotency key; a duplicate order costs real money |
| 2026-09-24 | Pricing placeholders: 45% target margin, 30% floor, $1.50 handling, free shipping over $50 | Open question §15. All are in one config each |
