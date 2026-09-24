import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { TokenVault } from "../src/crypto/token-vault";
import { hostAllowed, secureFetch } from "../src/http/secure-fetch";
import { redact, redactUrl } from "../src/http/redact";
import { rehostImage, sniffImage } from "../src/media/rehost";
import { htmlToPlainText } from "../src/content/sanitize";
import { parseAliExpressProductId } from "../src/import/parse-product-ref";
import { assertNoSupplierLeak, toPublicVariant } from "../src/public/projection";
import { toCents } from "../src/money";

const key = () => randomBytes(32).toString("base64");

describe("TokenVault", () => {
  it("round-trips and binds ciphertext to its purpose", () => {
    const v = new TokenVault(`k1:${key()}`);
    const sealed = v.encrypt("access-token-value", "ae:access");
    expect(sealed).not.toContain("access-token-value");
    expect(v.decrypt(sealed, "ae:access")).toBe("access-token-value");
    expect(() => v.decrypt(sealed, "ae:refresh")).toThrow();
  });
  it("detects tampering", () => {
    const v = new TokenVault(`k1:${key()}`);
    const parts = v.encrypt("x".repeat(40), "p").split(".");
    const ct = Buffer.from(parts[4]!, "base64url");
    ct[0]! ^= 1;
    parts[4] = ct.toString("base64url");
    expect(() => v.decrypt(parts.join("."), "p")).toThrow();
  });
  it("rotates keys: old ciphertext still opens, new writes use the active key", () => {
    const k1 = key();
    const old = new TokenVault(`k1:${k1}`).encrypt("t", "p");
    const rotated = new TokenVault(`k2:${key()},k1:${k1}`);
    expect(rotated.decrypt(old, "p")).toBe("t");
    expect(rotated.needsRotation(old)).toBe(true);
    expect(rotated.needsRotation(rotated.encrypt("t", "p"))).toBe(false);
  });
  it("refuses weak keys", () => {
    expect(() => new TokenVault(`k1:${Buffer.alloc(16).toString("base64")}`)).toThrow(/32 bytes/);
    expect(() => new TokenVault("")).toThrow();
  });
});

describe("secureFetch", () => {
  const ok = vi.fn(async () => new Response("hi"));
  it("matches hosts exactly or by subdomain wildcard", () => {
    expect(hostAllowed("ae01.alicdn.com", ["*.alicdn.com"])).toBe(true);
    expect(hostAllowed("alicdn.com.evil.io", ["*.alicdn.com"])).toBe(false);
    expect(hostAllowed("evilalicdn.com", ["*.alicdn.com"])).toBe(false);
  });
  it.each([
    ["http://api-sg.aliexpress.com/sync", "non-HTTPS"],
    ["https://169.254.169.254/latest/meta-data", "not allowlisted"],
    ["https://user:pw@api-sg.aliexpress.com/", "credentials"],
    ["not a url", "malformed"],
  ])("refuses %s", async (url, msg) => {
    await expect(secureFetch(url, {}, { allowHosts: ["api-sg.aliexpress.com"], fetchImpl: ok as unknown as typeof fetch })).rejects.toThrow(msg);
  });
  it("caps response size", async () => {
    const big = vi.fn(async () => new Response("x".repeat(2000)));
    await expect(
      secureFetch("https://a.example.com/", {}, { allowHosts: ["a.example.com"], maxBytes: 1000, fetchImpl: big as unknown as typeof fetch }),
    ).rejects.toMatchObject({ kind: "invalid_response" });
  });
  it("turns timeouts into transient errors with a redacted URL", async () => {
    const slow = vi.fn(async () => {
      const e = new Error("t");
      e.name = "TimeoutError";
      throw e;
    });
    await expect(
      secureFetch("https://a.example.com/?access_token=SECRET", {}, { allowHosts: ["a.example.com"], fetchImpl: slow as unknown as typeof fetch }),
    ).rejects.toSatisfy((e: Error) => e.message.includes("Timed out") && !e.message.includes("SECRET"));
  });
});

describe("redaction", () => {
  it("scrubs secrets from URLs and objects", () => {
    expect(redactUrl("https://x.com/?access_token=abc&product_id=1")).toBe("https://x.com/?access_token=%5Bredacted%5D&product_id=1");
    expect(redact({ app_key: "1", nested: { sign: "S", ok: 2 } })).toEqual({ app_key: "[redacted]", nested: { sign: "[redacted]", ok: 2 } });
  });
});

describe("image re-hosting", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
  const svg = new TextEncoder().encode('<svg onload="x()"/>');
  it("sniffs real image bytes and refuses SVG/HTML", () => {
    expect(sniffImage(jpeg)?.type).toBe("image/jpeg");
    expect(sniffImage(svg)).toBeNull();
  });
  it("stores under a content hash, not the supplier filename", async () => {
    const put = vi.fn(async (k: string) => `https://cdn.fetchfield.test/${k}`);
    const fetchImpl = vi.fn(async () => new Response(jpeg, { headers: { "content-type": "text/html" } }));
    const out = await rehostImage("//ae01.alicdn.com/kf/Sabc.jpg", { put }, { allowHosts: ["*.alicdn.com"], fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(out.url).toMatch(/^https:\/\/cdn\.fetchfield\.test\/products\/[0-9a-f]{64}\.jpg$/);
    expect(out.url).not.toContain("Sabc");
  });
  it("refuses images from other hosts", async () => {
    await expect(rehostImage("https://evil.example.com/a.jpg", { put: vi.fn() }, { allowHosts: ["*.alicdn.com"] })).rejects.toMatchObject({ kind: "blocked" });
  });
});

describe("content + input handling", () => {
  it("reduces supplier HTML to text without script content", () => {
    expect(htmlToPlainText('<p>Hi&nbsp;there</p><script>evil()</script><style>p{}</style><b>ok</b>')).toBe("Hi there\n ok");
  });
  it("extracts product ids from pasted links without fetching them", () => {
    expect(parseAliExpressProductId("1005006123456789")).toBe("1005006123456789");
    expect(parseAliExpressProductId("https://www.aliexpress.com/item/1005006123456789.html?spm=a2g0o")).toBe("1005006123456789");
    expect(parseAliExpressProductId("https://m.aliexpress.us/item/1005006123456789.html")).toBe("1005006123456789");
    expect(parseAliExpressProductId("https://aliexpress.com.evil.io/item/1005006123456789.html")).toBeNull();
    expect(parseAliExpressProductId("javascript:alert(1)")).toBeNull();
  });
  it("parses money without float drift", () => {
    expect(toCents("0.29")).toBe(29);
    expect(toCents("1,299.995")).toBe(130000);
    expect(toCents("-1")).toBeNull();
    expect(toCents("1e3")).toBeNull();
  });
});

describe("customer projection", () => {
  const internal = {
    sku: "FF-WLK-0142-M",
    options: { Color: "Moss" },
    priceCents: 2800,
    compareAtCents: null,
    availability: "available" as const,
    activeLink: { adapterId: "aliexpress", externalId: "1005006123456789", externalSkuId: "1|a", costCents: 642 },
  };
  it("copies only public fields", () => {
    const pub = toPublicVariant(internal);
    expect(pub).toEqual({ sku: "FF-WLK-0142-M", options: { Color: "Moss" }, priceCents: 2800, compareAtCents: null, availability: "available" });
    expect(() => assertNoSupplierLeak(pub)).not.toThrow();
  });
  it("hides margin-hidden variants entirely", () => {
    expect(toPublicVariant({ ...internal, availability: "hidden_margin" })).toBeNull();
  });
  it("catches supplier fields and URLs", () => {
    expect(() => assertNoSupplierLeak(internal)).toThrow(/activeLink/);
    expect(() => assertNoSupplierLeak({ img: "https://ae01.alicdn.com/x.jpg" })).toThrow(/leaked/);
    expect(() => assertNoSupplierLeak({ items: [{ costCents: 1 }] })).toThrow(/costCents/);
  });
});
