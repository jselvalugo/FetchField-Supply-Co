import { describe, expect, it, vi } from "vitest";
import type { AlertSink } from "../src/alerts";
import { SupplierError } from "../src/errors";
import { DEFAULT_RULE } from "../src/pricing/rules";
import { checkStaleness, runStockPriceSync, type SyncRepo, type SyncVariant } from "../src/sync/stock-price-sync";
import { forwardSupplierOrder, splitBySupplier, statusTransitionEmail, type ForwardingRepo, type SupplierOrderRow } from "../src/orders/forwarding";
import type { StockPrice, SupplierAdapter } from "../src/types";
import { CsvSupplierAdapter } from "../src/csv/adapter";

const now = new Date("2026-09-24T12:00:00Z");
const alerts = (): AlertSink & { list: string[] } => {
  const list: string[] = [];
  return { list, alert: (a) => void list.push(a.code) };
};

function fakeAdapter(id: string, data: StockPrice[] | Error): SupplierAdapter {
  return {
    id,
    fetchProduct: vi.fn(),
    fetchStockAndPrice: vi.fn(async () => {
      if (data instanceof Error) throw data;
      return data;
    }),
    quoteShipping: vi.fn(),
    placeOrder: vi.fn(),
    getOrderStatus: vi.fn(),
  };
}

function repo(variants: SyncVariant[]) {
  const availability = new Map(variants.map((v) => [v.variantId, v.availability]));
  const r: SyncRepo & { availability: typeof availability; updates: string[] } = {
    availability,
    updates: [],
    listPublishedVariants: async () => structuredClone(variants).map((v) => ({ ...v, availability: availability.get(v.variantId)! })),
    updateLink: async (id) => void r.updates.push(id),
    setAvailability: async (id, a) => void availability.set(id, a),
  };
  return r;
}

const variant = (over: Partial<SyncVariant> = {}): SyncVariant => ({
  variantId: "v1",
  priceCents: 1595,
  availability: "available",
  links: [
    { linkId: "l1", adapterId: "aliexpress", externalId: "100", externalSkuId: "a", priority: 1, shippingCents: 0, costCents: 642, stock: 10, syncedAt: null },
    { linkId: "l2", adapterId: "csv-acme", externalId: "X1", externalSkuId: "X1-M", priority: 2, shippingCents: 100, costCents: 500, stock: 50, syncedAt: null },
  ],
  ...over,
});

describe("stock and price sync", () => {
  it("marks sold out only when every linked supplier is out", async () => {
    const r = repo([variant()]);
    const a = alerts();
    const adapters = new Map([
      ["aliexpress", fakeAdapter("aliexpress", [{ externalId: "100", externalSkuId: "a", costCents: 642, stock: 0, available: false }])],
      ["csv-acme", fakeAdapter("csv-acme", [{ externalId: "X1", externalSkuId: "X1-M", costCents: 500, stock: 0, available: false }])],
    ]);
    const s = await runStockPriceSync({ adapters, repo: r, rule: DEFAULT_RULE, alerts: a, shipTo: "US", now: () => now });
    expect(s.soldOut).toEqual(["v1"]);
    expect(r.availability.get("v1")).toBe("sold_out");
  });

  it("fails over to the backup supplier when the primary runs out", async () => {
    const r = repo([variant()]);
    const setAvail = vi.spyOn(r, "setAvailability");
    const adapters = new Map([
      ["aliexpress", fakeAdapter("aliexpress", [{ externalId: "100", externalSkuId: "a", costCents: 642, stock: 0, available: false }])],
      ["csv-acme", fakeAdapter("csv-acme", [{ externalId: "X1", externalSkuId: "X1-M", costCents: 500, stock: 50, available: true }])],
    ]);
    await runStockPriceSync({ adapters, repo: r, rule: DEFAULT_RULE, alerts: alerts(), shipTo: "US", now: () => now });
    expect(setAvail).toHaveBeenCalledWith("v1", "available", "l2");
  });

  it("hides a variant and alerts when cost rises past the margin floor", async () => {
    const r = repo([variant({ links: [variant().links[0]!] })]);
    const a = alerts();
    const adapters = new Map([["aliexpress", fakeAdapter("aliexpress", [{ externalId: "100", externalSkuId: "a", costCents: 950, stock: 10, available: true }])]]);
    const s = await runStockPriceSync({ adapters, repo: r, rule: DEFAULT_RULE, alerts: a, shipTo: "US", now: () => now });
    expect(s.hiddenForMargin).toEqual(["v1"]);
    expect(a.list).toContain("margin_below_floor");
  });

  it("keeps last known state when a supplier is unreachable, and alerts", async () => {
    const r = repo([variant({ links: [variant().links[0]!] })]);
    const a = alerts();
    const adapters = new Map([["aliexpress", fakeAdapter("aliexpress", new SupplierError("transient", "down"))]]);
    const s = await runStockPriceSync({ adapters, repo: r, rule: DEFAULT_RULE, alerts: a, shipTo: "US", now: () => now });
    expect(s.failedAdapters).toEqual(["aliexpress"]);
    expect(r.availability.get("v1")).toBe("available");
    expect(r.updates).toEqual([]);
    expect(a.list).toEqual(["sync_failed"]);
  });

  it("treats a SKU missing from a successful fetch as gone", async () => {
    const r = repo([variant({ links: [variant().links[0]!] })]);
    const adapters = new Map([["aliexpress", fakeAdapter("aliexpress", [{ externalId: "100", externalSkuId: "other", costCents: 642, stock: 10, available: true }])]]);
    await runStockPriceSync({ adapters, repo: r, rule: DEFAULT_RULE, alerts: alerts(), shipTo: "US", now: () => now });
    expect(r.availability.get("v1")).toBe("sold_out");
  });

  it("alerts on stale data", async () => {
    const old = variant();
    old.links.forEach((l) => (l.syncedAt = new Date(now.getTime() - 25 * 3600_000)));
    const a = alerts();
    expect(await checkStaleness(repo([old]), a, now)).toEqual(["v1"]);
    expect(a.list).toEqual(["sync_stale"]);
  });
});

describe("order forwarding", () => {
  const baseRow = (): SupplierOrderRow => ({
    id: "so1",
    orderId: "FF-10042",
    adapterId: "aliexpress",
    state: "pending",
    attempts: 0,
    request: { idempotencyKey: "FF-10042-aliexpress", shipTo: { name: "a", line1: "b", city: "c", region: "OR", postalCode: "97205", country: "US", phone: "1" }, lines: [] },
    ref: null,
    lastError: null,
  });
  function frepo(row: SupplierOrderRow) {
    const r: ForwardingRepo & { row: SupplierOrderRow } = {
      row,
      get: async () => r.row,
      claim: async () => {
        if (r.row.state !== "pending" && r.row.state !== "retry") return false;
        r.row = { ...r.row, state: "placing", attempts: r.row.attempts + 1 };
        return true;
      },
      markPlaced: async (_id, ref) => void (r.row = { ...r.row, state: "placed", ref }),
      markRetry: async (_id, e) => void (r.row = { ...r.row, state: "retry", lastError: e }),
      markNeedsAttention: async (_id, e) => void (r.row = { ...r.row, state: "needs_attention", lastError: e }),
    };
    return r;
  }
  const adapterPlacing = (impl: () => Promise<unknown>) =>
    new Map([["aliexpress", { ...fakeAdapter("aliexpress", []), placeOrder: vi.fn(impl) } as SupplierAdapter]]);

  it("places once and is idempotent afterwards", async () => {
    const r = frepo(baseRow());
    const adapters = adapterPlacing(async () => ({ adapterId: "aliexpress", externalOrderIds: ["1"] }));
    expect((await forwardSupplierOrder("so1", { repo: r, adapters, alerts: alerts() })).kind).toBe("placed");
    expect((await forwardSupplierOrder("so1", { repo: r, adapters, alerts: alerts() })).kind).toBe("skipped");
    expect(adapters.get("aliexpress")!.placeOrder).toHaveBeenCalledTimes(1);
  });

  it("retries transient failures, then parks after 3 attempts", async () => {
    const r = frepo(baseRow());
    const a = alerts();
    const adapters = adapterPlacing(async () => {
      throw new SupplierError("transient", "503");
    });
    const deps = { repo: r, adapters, alerts: a, rand: () => 0.5 };
    expect((await forwardSupplierOrder("so1", deps)).kind).toBe("retry");
    expect((await forwardSupplierOrder("so1", deps)).kind).toBe("retry");
    expect((await forwardSupplierOrder("so1", deps)).kind).toBe("needs_attention");
    expect(r.row.state).toBe("needs_attention");
    expect(a.list).toEqual(["order_needs_attention"]);
  });

  it("never retries an unknown outcome", async () => {
    const r = frepo(baseRow());
    const adapters = adapterPlacing(async () => {
      throw new SupplierError("unknown_outcome", "timeout after send");
    });
    const out = await forwardSupplierOrder("so1", { repo: r, adapters, alerts: alerts() });
    expect(out).toMatchObject({ kind: "needs_attention" });
    expect(r.row.lastError).toContain("FF FF-10042-aliexpress");
  });

  it("parks a row found stuck mid-placement", async () => {
    const r = frepo({ ...baseRow(), state: "placing", attempts: 1 });
    const adapters = adapterPlacing(async () => ({ adapterId: "aliexpress", externalOrderIds: ["1"] }));
    expect((await forwardSupplierOrder("so1", { repo: r, adapters, alerts: alerts() })).kind).toBe("needs_attention");
    expect(adapters.get("aliexpress")!.placeOrder).not.toHaveBeenCalled();
  });

  it("splits by supplier with stable idempotency keys", () => {
    const addr = baseRow().request.shipTo;
    const link = (adapterId: string) => ({ adapterId, externalId: "1", externalSkuId: "s", shippingServiceCode: "STD" });
    const parts = splitBySupplier("FF-1", [
      { variantId: "a", quantity: 1, link: link("aliexpress") },
      { variantId: "b", quantity: 2, link: link("csv-acme") },
      { variantId: "c", quantity: 1, link: link("aliexpress") },
    ], addr);
    expect(parts.map((p) => [p.adapterId, p.request.idempotencyKey, p.request.lines.length])).toEqual([
      ["aliexpress", "FF-1-aliexpress", 2],
      ["csv-acme", "FF-1-csv-acme", 1],
    ]);
  });

  it("sends shipped/delivered emails once", () => {
    const t = [{ carrier: "USPS", trackingNumber: "1", trackingUrl: null, events: [] }];
    expect(statusTransitionEmail(null, { state: "shipped", tracking: t, updatedAt: now })).toBe("shipped");
    expect(statusTransitionEmail({ state: "shipped", tracking: t, updatedAt: now }, { state: "shipped", tracking: t, updatedAt: now })).toBeNull();
    expect(statusTransitionEmail({ state: "shipped", tracking: t, updatedAt: now }, { state: "delivered", tracking: t, updatedAt: now })).toBe("delivered");
  });
});

describe("CSV supplier", () => {
  const sheet = `external_id,sku,title,option_name,option_value,cost_usd,stock,min_days,max_days,ships_from,shipping_usd
BIN-60,BIN-60-GRN,"Steel waste bin, 10 gal",Color,Green,84.50,40,3,6,US,12.00
BIN-60,BIN-60-BLK,"Steel waste bin, 10 gal",Color,Black,84.50,0,3,6,US,12.00`;
  it("loads a sheet and reports stock", async () => {
    const a = new CsvSupplierAdapter("csv-acme", async () => sheet);
    const sp = await a.fetchStockAndPrice(["BIN-60"], "US");
    expect(sp).toEqual([
      { externalId: "BIN-60", externalSkuId: "BIN-60-GRN", costCents: 8450, stock: 40, available: true },
      { externalId: "BIN-60", externalSkuId: "BIN-60-BLK", costCents: 8450, stock: 0, available: false },
    ]);
  });
  it("rejects the whole sheet if one row is bad", async () => {
    const a = new CsvSupplierAdapter("csv-acme", async () => `${sheet}\nBIN-61,X,Bad,,,-3,1,1,2,US,0`);
    await expect(a.reload()).rejects.toMatchObject({ kind: "invalid_response" });
  });
});
