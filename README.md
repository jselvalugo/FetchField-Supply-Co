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
Set `ADMIN_USER` and `ADMIN_PASSWORD` (12+ characters) to open `/admin/suppliers`.

The supplier connection and how to run it safely: **[docs/supplier-integration.md](docs/supplier-integration.md)**.
