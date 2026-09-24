import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_RULE, TokenVault, type SupplierAdapter } from "@fetchfield/suppliers";
import { PgAlertSink, PgForwardingRepo, PgTokenStore } from "../src/db/repos";
import { forwardOrderJob, stockPriceSyncJob, type JobDeps } from "../src/jobs";

/** Runs against a throwaway database: TEST_DATABASE_URL=postgres://... npm test -w @fetchfield/worker */
const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("postgres repos", () => {
  let pool: pg.Pool;
  const vault = new TokenVault(`k1:${randomBytes(32).toString("base64")}`);

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: url });
    await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    await pool.query(readFileSync(new URL("../src/db/schema.sql", import.meta.url), "utf8"));
  });
  afterAll(async () => pool?.end());

  it("stores tokens encrypted and reads them back", async () => {
    const store = new PgTokenStore(pool, vault);
    const token = { accessToken: "access-PLAINTEXT-123456", refreshToken: "refresh-PLAINTEXT-123456", accessExpiresAt: new Date(Date.now() + 864e5), refreshExpiresAt: new Date(Date.now() + 30 * 864e5), account: "ff-dropship" };
    await store.save(token);
    const raw = await pool.query("SELECT access_token_enc, refresh_token_enc FROM supplier_credentials");
    expect(JSON.stringify(raw.rows)).not.toContain("PLAINTEXT");
    expect((await store.load())?.accessToken).toBe(token.accessToken);
  });

  it("runs a sync end to end: sold out, failover and run log", async () => {
    await pool.query(`INSERT INTO catalog_variants (variant_id, price_cents, published) VALUES ('v-leash-moss', 3400, true)`);
    await pool.query(`INSERT INTO supplier_links (variant_id, adapter_id, external_id, external_sku, priority, cost_cents, stock)
      VALUES ('v-leash-moss', 'aliexpress', '1005006123456789', '1|a', 1, 900, 10), ('v-leash-moss', 'csv-acme', 'L-6', 'L-6-M', 2, 1000, 5)`);
    const adapter = (id: string, stock: number, cost: number): SupplierAdapter => ({
      id,
      fetchStockAndPrice: async (ids) => ids.map((e) => ({ externalId: e, externalSkuId: id === "aliexpress" ? "1|a" : "L-6-M", costCents: cost, stock, available: stock > 0 })),
      fetchProduct: async () => { throw new Error("unused"); },
      quoteShipping: async () => [],
      placeOrder: async () => ({ adapterId: id, externalOrderIds: ["1"] }),
      getOrderStatus: async () => ({ state: "processing", tracking: [], updatedAt: new Date() }),
    });
    const deps: JobDeps = {
      db: pool,
      adapters: new Map([["aliexpress", adapter("aliexpress", 0, 900)], ["csv-acme", adapter("csv-acme", 5, 1000)]]),
      alerts: new PgAlertSink(pool),
      rule: DEFAULT_RULE,
      shipTo: "US",
      notify: async () => {},
    };
    await stockPriceSyncJob(deps);
    const v = await pool.query("SELECT availability, active_link_id FROM catalog_variants");
    const backup = await pool.query("SELECT id FROM supplier_links WHERE adapter_id = 'csv-acme'");
    expect(v.rows[0]).toMatchObject({ availability: "available", active_link_id: backup.rows[0].id });
    const runs = await pool.query("SELECT summary FROM sync_runs WHERE finished_at IS NOT NULL");
    expect(runs.rows[0].summary.linksUpdated).toBe(2);
  });

  it("lets only one worker claim a supplier order", async () => {
    await pool.query(`INSERT INTO supplier_orders (id, order_id, adapter_id, request) VALUES ('so-1', 'FF-10001', 'aliexpress', $1)`, [
      JSON.stringify({ idempotencyKey: "FF-10001-aliexpress", lines: [], shipTo: {} }),
    ]);
    const repo = new PgForwardingRepo(pool);
    const results = await Promise.all(Array.from({ length: 8 }, () => repo.claim("so-1")));
    expect(results.filter(Boolean)).toHaveLength(1);
    // The row is now "placing"; a second forward attempt parks it instead of placing twice.
    let placed = 0;
    const out = await forwardOrderJob(
      { db: pool, adapters: new Map([["aliexpress", { placeOrder: async () => { placed++; return { adapterId: "aliexpress", externalOrderIds: ["9"] }; } } as unknown as SupplierAdapter]]), alerts: new PgAlertSink(pool), rule: DEFAULT_RULE, shipTo: "US", notify: async () => {} },
      "so-1",
    );
    expect(out.kind).toBe("needs_attention");
    expect(placed).toBe(0);
  });
});
