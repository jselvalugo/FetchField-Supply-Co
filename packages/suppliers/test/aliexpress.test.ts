import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { AeClient, classifyAeError } from "../src/aliexpress/client";
import { AliExpressAdapter, decodeSkuRef, encodeSkuRef, mergeStatuses } from "../src/aliexpress/adapter";
import { signRequest } from "../src/aliexpress/sign";
import { loadAeConfig } from "../src/aliexpress/config";
import { AeTokenManager, type AeToken } from "../src/aliexpress/token-manager";
import { SupplierError } from "../src/errors";
import { CircuitBreaker, RateLimiter } from "../src/http/guards";
import { freight, orderCreateOk, orderCreateRefused, orderGetShipped, productGet } from "./fixtures/ae";

const config = { AE_APP_KEY: "501234", AE_APP_SECRET: "s3cr3t-s3cr3t-s3cr3t", AE_API_BASE: "https://api-sg.aliexpress.com", AE_QPS: 100 };
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function client(fetchImpl: typeof fetch) {
  return new AeClient({
    config,
    getAccessToken: async () => "tok_abcdefghijklmnop",
    fetchImpl,
    now: () => 1_700_000_000_000,
    limiter: new RateLimiter(1000),
    breaker: new CircuitBreaker(2, 60_000),
  });
}

describe("signRequest", () => {
  it("sorts params, concatenates key+value and HMAC-SHA256s them upper-case", () => {
    const params = { method: "aliexpress.ds.product.get", app_key: "501234", timestamp: "1", sign_method: "sha256" };
    const expected = createHmac("sha256", "secret")
      .update("app_key501234methodaliexpress.ds.product.getsign_methodsha256timestamp1")
      .digest("hex")
      .toUpperCase();
    expect(signRequest(params, "secret")).toBe(expected);
  });
  it("prefixes the API path for system calls and ignores an existing sign", () => {
    const a = signRequest({ code: "x", sign: "OLD" }, "k", "/auth/token/create");
    const b = createHmac("sha256", "k").update("/auth/token/createcodex").digest("hex").toUpperCase();
    expect(a).toBe(b);
  });
});

describe("AeClient", () => {
  it("sends secrets in a signed POST body, never in the URL", async () => {
    const fetchImpl = vi.fn(async (_u: URL | RequestInfo, _init?: RequestInit) => jsonResponse(productGet()));
    await client(fetchImpl as unknown as typeof fetch).call("aliexpress.ds.product.get", { product_id: "1005006123456789" });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toBe("https://api-sg.aliexpress.com/sync");
    expect(init?.method).toBe("POST");
    expect(init?.redirect).toBe("error");
    const body = new URLSearchParams(String(init?.body));
    expect(body.get("access_token")).toBe("tok_abcdefghijklmnop");
    expect(body.get("sign")).toMatch(/^[0-9A-F]{64}$/);
    expect(body.has("app_secret")).toBe(false);
    expect(String(init?.body)).not.toContain(config.AE_APP_SECRET);
    const { sign, ...rest } = Object.fromEntries(body);
    expect(sign).toBe(signRequest(rest, config.AE_APP_SECRET));
  });

  it("refuses non-allowlisted API bases and odd method names", async () => {
    const c = new AeClient({ config: { ...config, AE_API_BASE: "https://evil.example.com" }, getAccessToken: async () => "t" });
    await expect(c.call("aliexpress.ds.product.get", {})).rejects.toMatchObject({ kind: "blocked" });
    await expect(client(fetch).call("taobao.anything", {})).rejects.toMatchObject({ kind: "blocked" });
  });

  it("maps error envelopes to error kinds", async () => {
    const f = async () => jsonResponse({ error_response: { code: "IllegalAccessToken", msg: "expired" } });
    await expect(client(f as typeof fetch).call("aliexpress.ds.product.get", {})).rejects.toMatchObject({ kind: "auth" });
    expect(classifyAeError({ code: "ApiCallLimit" }).kind).toBe("rate_limited");
    expect(classifyAeError({ code: "15", sub_code: "isp.remote-service-timeout" }).kind).toBe("transient");
    expect(classifyAeError({ code: "15", sub_code: "isv.product-not-exist" }).kind).toBe("rejected");
  });

  it("opens the circuit after repeated transient failures", async () => {
    const f = vi.fn(async () => new Response("down", { status: 503 }));
    const c = client(f as unknown as typeof fetch);
    await expect(c.call("aliexpress.ds.product.get", {})).rejects.toMatchObject({ kind: "transient" });
    await expect(c.call("aliexpress.ds.product.get", {})).rejects.toMatchObject({ kind: "transient" });
    await expect(c.call("aliexpress.ds.product.get", {})).rejects.toMatchObject({ kind: "blocked" });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("builds a CSRF-bound authorize URL", () => {
    const u = new URL(AeClient.authorizeUrl("501234", "https://admin.example.com/cb", "nonce123"));
    expect(u.origin).toBe("https://api-sg.aliexpress.com");
    expect(u.searchParams.get("state")).toBe("nonce123");
  });
});

describe("loadAeConfig", () => {
  it("names bad keys without echoing values", () => {
    expect(() => loadAeConfig({ AE_APP_KEY: "abc", AE_APP_SECRET: "tiny" })).toThrow(/AE_APP_KEY.*AE_APP_SECRET/);
    try {
      loadAeConfig({ AE_APP_SECRET: "tiny-secret-value" });
    } catch (e) {
      expect(String(e)).not.toContain("tiny-secret-value");
    }
  });
});

describe("AliExpressAdapter", () => {
  const adapterWith = (...bodies: unknown[]) => {
    const call = vi.fn();
    for (const b of bodies) call.mockResolvedValueOnce(b);
    return { adapter: new AliExpressAdapter({ call }, { now: () => new Date("2026-09-24T12:00:00Z") }), call };
  };

  it("parses product.get into our types, dropping unsafe images and HTML", async () => {
    const { adapter } = adapterWith(productGet());
    const p = await adapter.fetchProduct("1005006123456789", "US");
    expect(p.title).toContain("Leash");
    expect(p.images).toEqual([{ url: "https://ae01.alicdn.com/kf/S1.jpg", role: "main" }]);
    expect(p.descriptionText).toBe("Strong leash\nfor walking");
    expect(p.skus[0]).toMatchObject({ costCents: 642, stock: 412, options: { Color: "Moss", Length: "1.5m" } });
    expect(decodeSkuRef(p.skus[0]!.externalSkuId)).toEqual({ skuId: "12000036123456701", skuAttr: "14:193#Moss;5:100014064" });
    expect(p.packageDims?.weightKg).toBe(0.21);
  });

  it("rejects malformed ids before calling out", async () => {
    const { adapter, call } = adapterWith();
    await expect(adapter.fetchProduct("1 OR 1=1", "US")).rejects.toMatchObject({ kind: "rejected" });
    expect(call).not.toHaveBeenCalled();
  });

  it("treats a changed response shape as invalid, not as zero stock", async () => {
    const { adapter } = adapterWith({ aliexpress_ds_product_get_response: { result: { surprise: true } } });
    await expect(adapter.fetchProduct("1005006123456789", "US")).rejects.toMatchObject({ kind: "invalid_response" });
  });

  it("refuses non-USD prices", async () => {
    const body = productGet();
    body.aliexpress_ds_product_get_response.result.ae_item_sku_info_dtos.ae_item_sku_info_d_t_o[0]!.currency_code = "CNY";
    const { adapter } = adapterWith(body);
    await expect(adapter.fetchProduct("1005006123456789", "US")).rejects.toMatchObject({ kind: "invalid_response" });
  });

  it("marks delisted products unavailable in stock sync", async () => {
    const { adapter } = adapterWith(productGet({ status: "offline" }));
    const [sp] = await adapter.fetchStockAndPrice(["1005006123456789"], "US");
    expect(sp).toMatchObject({ available: false, stock: 412 });
  });

  it("quotes shipping as options common to every line", async () => {
    const { adapter, call } = adapterWith(freight, freight);
    const ref = encodeSkuRef("12000036123456701", "14:193#Moss");
    const opts = await adapter.quoteShipping(
      [
        { externalId: "1005006123456789", externalSkuId: ref, quantity: 1 },
        { externalId: "1005006123456790", externalSkuId: ref, quantity: 2 },
      ],
      { name: "A", line1: "1 Main", city: "Portland", region: "OR", postalCode: "97205", country: "US", phone: "5035550100" },
    );
    expect(call).toHaveBeenCalledTimes(2);
    expect(opts.find((o) => o.serviceCode === "EMS")).toMatchObject({ costCents: 2900, minDays: 5, maxDays: 9 });
    expect(opts.find((o) => o.serviceCode.startsWith("CAINIAO"))?.costCents).toBe(0);
  });

  const order = {
    idempotencyKey: "so_123",
    shipTo: { name: "Sam Park", line1: "1 Main St", city: "Portland", region: "OR", postalCode: "97205", country: "US", phone: "(503) 555-0100" },
    lines: [{ externalId: "1005006123456789", externalSkuId: encodeSkuRef("1", "14:193#Moss"), quantity: 1, shippingServiceCode: "CAINIAO_FULFILLMENT_STD" }],
  };

  it("places orders with our memo and returns supplier ids", async () => {
    const { adapter, call } = adapterWith(orderCreateOk);
    const ref = await adapter.placeOrder(order);
    expect(ref.externalOrderIds).toEqual(["8187654321001"]);
    const payload = JSON.parse(call.mock.calls[0]![1].param_place_order_request4_open_api_d_t_o);
    expect(payload.product_items[0]).toMatchObject({ sku_attr: "14:193#Moss", order_memo: "FF so_123" });
    expect(payload.logistics_address.mobile_no).toBe("5035550100");
  });

  it("reports refusals as rejected and timeouts as unknown outcome", async () => {
    await expect(adapterWith(orderCreateRefused).adapter.placeOrder(order)).rejects.toMatchObject({ kind: "rejected" });
    const call = vi.fn().mockRejectedValue(new SupplierError("transient", "Timed out"));
    await expect(new AliExpressAdapter({ call }).placeOrder(order)).rejects.toMatchObject({ kind: "unknown_outcome" });
  });

  it("reads order status and tracking", async () => {
    const { adapter } = adapterWith(orderGetShipped);
    const s = await adapter.getOrderStatus({ adapterId: "aliexpress", externalOrderIds: ["8187654321001"] });
    expect(s.state).toBe("shipped");
    expect(s.tracking[0]?.trackingNumber).toBe("LP00612345678");
  });

  it("reports a split order at its least-advanced part", () => {
    const now = new Date();
    const s = mergeStatuses(
      [
        { state: "delivered", tracking: [], updatedAt: now },
        { state: "processing", tracking: [], updatedAt: now },
        { state: "cancelled", tracking: [], updatedAt: now },
      ],
      now,
    );
    expect(s.state).toBe("processing");
  });
});

describe("AeTokenManager", () => {
  const token = (accessInMs: number, refreshInMs: number, now: number): AeToken => ({
    accessToken: "old",
    refreshToken: "r1",
    accessExpiresAt: new Date(now + accessInMs),
    refreshExpiresAt: new Date(now + refreshInMs),
    account: "ff",
  });
  const now = new Date("2026-09-24T00:00:00Z");
  const DAY = 86_400_000;

  it("returns a healthy token without refreshing", async () => {
    const refresh = vi.fn();
    const m = new AeTokenManager({ load: async () => token(5 * DAY, 30 * DAY, now.getTime()), save: vi.fn() }, { refresh }, () => now);
    expect(await m.getAccessToken()).toBe("old");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refreshes once for concurrent callers and saves the new token", async () => {
    let stored = token(DAY / 2, 30 * DAY, now.getTime());
    const save = vi.fn(async (t: AeToken) => {
      stored = t;
    });
    const refresh = vi.fn(async () => ({ ...token(30 * DAY, 60 * DAY, now.getTime()), accessToken: "new" }));
    const m = new AeTokenManager({ load: async () => stored, save }, { refresh }, () => now);
    const out = await Promise.all([m.getAccessToken(), m.getAccessToken(), m.getAccessToken()]);
    expect(out).toEqual(["new", "new", "new"]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("alerts and fails when the refresh token has expired", async () => {
    const onAlert = vi.fn();
    const m = new AeTokenManager({ load: async () => token(-DAY, -1, now.getTime()), save: vi.fn() }, { refresh: vi.fn() }, () => now, onAlert);
    await expect(m.getAccessToken()).rejects.toMatchObject({ kind: "auth" });
    expect(onAlert).toHaveBeenCalled();
  });
});
