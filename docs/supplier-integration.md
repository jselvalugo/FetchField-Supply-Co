# Supplier integration: how the AliExpress connection is secured and run

This is the operating guide for the connection between FetchField Shop and our
suppliers. The official route is the **AliExpress Open Platform "DS" (dropshipper) API**.
Wholesale deals with Alibaba.com manufacturers come in as **CSV sheets** instead.

## Architecture in one picture

```
 Admin (browser)            apps/web (public)                apps/worker (private)            Suppliers
 ───────────────            ─────────────────                ─────────────────────            ─────────
 /admin/suppliers ──auth──► reads curated catalog only       BullMQ jobs ── signed HTTPS ──► api-sg.aliexpress.com
   (review queue)           never imports supplier creds     • stock/price every 6h            (allowlisted host)
                            prices re-checked server-side    • tracking every 4h
                            Stripe Checkout for payment      • order forwarding on payment   ◄── CSV sheets
                                                             • staleness hourly                   (manufacturers)
                                       ▲                              │
                                       └──────── Postgres ◄───────────┘
                                          (tokens encrypted, links, runs, alerts)
```

The storefront and the supplier connection are separate processes. The web app has
no AliExpress credentials, so a bug or compromise on the public site can't use them.

## Security controls (what's built, where)

| Risk | Control | Code |
|---|---|---|
| App secret leaks | Only in the worker's environment. Validated at startup, never logged, never sent (requests are HMAC-signed with it) | `packages/suppliers/src/aliexpress/{config,sign,client}.ts` |
| OAuth token stolen from the database | AES-256-GCM encryption at rest, key ring with rotation (`k2:…,k1:…`), ciphertext bound to its purpose so an access token can't be swapped into the refresh column | `crypto/token-vault.ts`, `apps/worker/src/db/repos.ts` |
| Tokens in logs or proxies | Params go in a POST body, not the URL. Error messages and logs pass through a redactor | `http/redact.ts` |
| Server-side request forgery (SSRF) from supplier data | One `secureFetch` for all outbound calls: HTTPS only, exact host allowlist, redirects refused, timeouts, response-size caps | `http/secure-fetch.ts` |
| Malicious supplier content | Descriptions reduced to plain text and never rendered. Images re-hosted only from the supplier CDN allowlist, checked by magic bytes (SVG refused), stored under a SHA-256 name | `content/sanitize.ts`, `media/rehost.ts` |
| Supplier changes their API | Every response is validated with zod. An unexpected shape stops the sync (`invalid_response`) instead of writing a wrong price or zero stock | `aliexpress/schemas.ts` |
| Duplicate or lost orders | Database compare-and-set claim. Transient errors retry at most 3 times. **A timeout while placing an order is never retried automatically**: it's parked as "Needs attention" with the memo to search for | `orders/forwarding.ts`, `PgForwardingRepo.claim` |
| Selling at a loss | Sync re-checks margin after every cost change. Below the floor the variant is hidden and an admin is alerted. Prices never change silently | `sync/stock-price-sync.ts`, `pricing/rules.ts` |
| Overselling | Stock 0 at every linked supplier → sold out. Stock is checked again before checkout | same |
| Supplier name, cost or IDs reaching customers | Customer data is built from an allowlist projection. In development, every catalog response is scanned by `assertNoSupplierLeak`. An e2e test checks rendered pages | `public/projection.ts`, `apps/web/lib/catalog`, `apps/web/e2e/checkout.spec.ts` |
| Hammering a failing API | Token-bucket rate limit plus a circuit breaker | `http/guards.ts` |
| Admin pages exposed | `/admin` returns 404 unless credentials are configured, then requires basic auth. It's noindex and no-store. Production should use SSO in front | `apps/web/proxy.ts` |
| Payment data | Never touches our servers (Stripe Checkout). Cart prices are recomputed server-side from SKUs | `apps/web/lib/actions/checkout.ts` |

## Setup, step by step

1. **Create the app** on the AliExpress Open Platform (openservice.aliexpress.com) as a
   Dropshipping app. Note the App Key and App Secret. Set the callback URL to an HTTPS URL you control.
2. **Generate an encryption key** for tokens: `openssl rand -base64 32`.
3. **Set worker secrets** in your host's secret manager (Railway/Render), not in a `.env` file in git:
   ```
   DATABASE_URL=postgres://…?sslmode=require
   REDIS_URL=rediss://…
   AE_APP_KEY=…            AE_APP_SECRET=…
   AE_REDIRECT_URI=https://…/aliexpress/callback
   SUPPLIER_TOKEN_KEYS=k1:<base64 key>
   CSV_SUPPLIERS=csv-acme=/secure/path/acme.csv   # optional
   ```
4. `npm run migrate -w @fetchfield/worker` creates the tables.
5. `npm run connect-aliexpress -w @fetchfield/worker` prints an authorize link with a one-time
   CSRF `state`. Approve it, then paste back the redirect URL. Tokens are saved encrypted,
   and they refresh automatically 24h before expiry.
6. `npm start -w @fetchfield/worker` starts the jobs.

**Rotating the encryption key:** set `SUPPLIER_TOKEN_KEYS=k2:<new>,k1:<old>` and restart. Rows
re-encrypt with `k2` on next read. Remove `k1` after a day.

## Day-to-day management

**Adding a product.** Paste a product link or ID in Admin → Suppliers. The ID is parsed
locally; we never fetch the pasted URL. The raw data lands in `supplier_products`. Nothing is
public until every check in the queue is done:
supplier rating → sample ordered and tested → materials verified → sizing measured →
ships within 12 days → our own copy written → images re-hosted → price checked against the floor.

**Pricing.** The rule is cost + shipping + $1.50 handling + card fees, at a 45% target margin with
a 30% floor, rounded up to .00/.50/.95. These are placeholders until §15 is decided; change
`DEFAULT_RULE` in `packages/suppliers/src/pricing/rules.ts`.

**Multiple suppliers per product.** Link a variant to several supplier SKUs with a priority.
If the first sells out or its cost breaks the floor, the sync switches to the next, and the listing never changes.

**Alerts to act on**

| Alert | What to do |
|---|---|
| `margin_below_floor` | Reprice, or add or promote a cheaper supplier link |
| `order_needs_attention` | Open the supplier's order list and search for the memo `FF <order>-<adapter>`. If the order exists, record its ID. If not, retry |
| `sync_stale` | Check the worker is running and the supplier status. Items keep selling on the last known data, and checkout re-checks stock |
| `auth_expired` | Re-run `connect-aliexpress` |
| `order_delay_notice` | Sent automatically (FTC Mail Order Rule). Watch for cancellations |

## What's verified and what isn't yet

- Verified by tests: signing, encryption, fetch guards, response parsing (against fixtures), pricing, sync, forwarding,
  FTC deadlines, customer projection (66 unit tests); Postgres repos, including the concurrent order claim (3 integration tests);
  storefront flows and supplier-leak checks (12 e2e tests); accessibility (13 axe scans).
- **Not yet verified against the live API.** The AliExpress field names follow the published DS docs. Before launch, run
  `fetchProduct`, `quoteShipping` and one real `placeOrder` with the sandbox or a real $1 order, and adjust
  `aliexpress/schemas.ts` if any field differs. The zod layer will fail loudly rather than guess.
- Medusa isn't wired in yet. `catalog_variants` stands in for Medusa's variant and price tables, and
  `apps/web/lib/catalog` is the one file to swap for Medusa's Store API.
