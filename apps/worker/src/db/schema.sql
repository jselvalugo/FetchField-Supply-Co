-- Supplier integration tables (spec §8, §9). Medusa owns products, variants and
-- orders; these tables hang off Medusa ids and are only read by the worker and
-- the admin. Nothing here is exposed to customer-facing APIs.

CREATE TABLE IF NOT EXISTS supplier_credentials (
  adapter_id        text PRIMARY KEY,
  -- TokenVault ciphertexts ("v1.<kid>.<iv>.<tag>.<ct>"), bound by AAD to their column purpose.
  access_token_enc  text NOT NULL,
  refresh_token_enc text NOT NULL,
  access_expires_at  timestamptz NOT NULL,
  refresh_expires_at timestamptz NOT NULL,
  account           text NOT NULL,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Raw imports, never shown to customers (spec §8.3 step 1).
CREATE TABLE IF NOT EXISTS supplier_products (
  id           bigserial PRIMARY KEY,
  adapter_id   text NOT NULL,
  external_id  text NOT NULL,
  raw          jsonb NOT NULL,
  fetched_at   timestamptz NOT NULL,
  -- Curation checklist (spec §8.3 step 2)
  vet          jsonb NOT NULL DEFAULT '{}'::jsonb,
  status       text NOT NULL DEFAULT 'staged' CHECK (status IN ('staged', 'in_review', 'rejected', 'published')),
  UNIQUE (adapter_id, external_id)
);

-- Minimal variant mirror the sync needs. In production this is a view over Medusa's variant and price tables.
CREATE TABLE IF NOT EXISTS catalog_variants (
  variant_id      text PRIMARY KEY,
  price_cents     integer NOT NULL CHECK (price_cents > 0),
  published       boolean NOT NULL DEFAULT false,
  availability    text NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'sold_out', 'hidden_margin')),
  active_link_id  bigint
);

-- One published variant → one or more supplier SKUs, so suppliers can be switched without touching the listing.
CREATE TABLE IF NOT EXISTS supplier_links (
  id              bigserial PRIMARY KEY,
  variant_id      text NOT NULL REFERENCES catalog_variants(variant_id) ON DELETE CASCADE,
  adapter_id      text NOT NULL,
  external_id     text NOT NULL,
  external_sku    text NOT NULL,
  priority        integer NOT NULL DEFAULT 1,
  shipping_cents  integer NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  cost_cents      integer NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
  stock           integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  available       boolean NOT NULL DEFAULT false,
  synced_at       timestamptz,
  UNIQUE (variant_id, adapter_id, external_sku)
);
CREATE INDEX IF NOT EXISTS supplier_links_adapter ON supplier_links (adapter_id, external_id);

CREATE TABLE IF NOT EXISTS supplier_orders (
  id              text PRIMARY KEY,
  order_id        text NOT NULL,
  adapter_id      text NOT NULL,
  state           text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'placing', 'retry', 'placed', 'needs_attention')),
  attempts        integer NOT NULL DEFAULT 0,
  request         jsonb NOT NULL,
  ref             jsonb,
  last_status     jsonb,
  last_error      text,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, adapter_id)
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id          bigserial PRIMARY KEY,
  kind        text NOT NULL,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  summary     jsonb
);

CREATE TABLE IF NOT EXISTS alerts (
  id          bigserial PRIMARY KEY,
  level       text NOT NULL,
  code        text NOT NULL,
  message     text NOT NULL,
  ref         text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
