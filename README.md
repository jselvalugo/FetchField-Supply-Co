# FetchField Supply Co.

Dog park equipment for parks and properties (**FetchField Pro**) and tested gear for dog owners (**FetchField Shop**).

```
apps/web          Next.js storefront: Pro, Shop, Field notes, admin
apps/worker       BullMQ jobs: supplier sync, order forwarding, tracking, FTC checks
packages/tokens   Design tokens → CSS variables + Tailwind theme
packages/ui       Design system: SpecPlate, TrailMarker, OrthoDrawing, PriceTierTable…
packages/suppliers  SupplierAdapter, AliExpress DS + CSV adapters, pricing rules, sync
brand/logo        Logo files and usage
docs/             Supplier integration guide, decisions log
```

## Run it

```bash
npm install
npm run dev                         # storefront at http://localhost:3000
npm test                            # unit tests (tokens, suppliers, worker)
npm run build && npm run e2e -w @fetchfield/web   # e2e + accessibility (Playwright)
```

Copy `apps/web/.env.example` to `apps/web/.env.local`. Without Stripe keys, checkout says payments are off and takes no order.

## Launch mode and admin

- `COMING_SOON=1`: every public page shows the Coming Soon page with a launch email list.
  The team opens the full site at `/preview` with `PREVIEW_PASSWORD`.
- `/admin` (password: `ADMIN_PASSWORD`): dashboard, launch-list signups with CSV export,
  quote requests with status and notes, orders recorded from Stripe with fulfilment and tracking,
  product editing (price, visibility, stock, tiers, lead time), supplier queue, settings and an activity log.
- Data lives in Netlify Blobs on Netlify and in `apps/web/.data/` locally.

The supplier connection and how to run it safely: **[docs/supplier-integration.md](docs/supplier-integration.md)**.
