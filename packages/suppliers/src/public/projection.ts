/**
 * The only way supplier-linked data becomes customer-facing (spec §8.5, §14).
 * Built as an explicit allowlist: fields are copied by name, so a new internal
 * field can't slip into an API response or page by accident.
 * `assertNoSupplierLeak` is a belt-and-braces check used in tests and in the
 * storefront's data layer in development.
 */

export interface PublicVariant {
  sku: string; // OUR sku, e.g. FF-WLK-0142-M
  options: Record<string, string>;
  priceCents: number;
  compareAtCents: number | null;
  availability: "available" | "sold_out";
}

export interface PublicShipWindow {
  transitMinDays: number;
  transitMaxDays: number;
}

export interface InternalShopVariant {
  sku: string;
  options: Record<string, string>;
  priceCents: number;
  compareAtCents: number | null;
  availability: "available" | "sold_out" | "hidden_margin";
  // Internal-only fields below. Never copied.
  activeLink?: { adapterId: string; externalId: string; externalSkuId: string; costCents: number } | null;
}

export function toPublicVariant(v: InternalShopVariant): PublicVariant | null {
  if (v.availability === "hidden_margin") return null;
  return {
    sku: v.sku,
    options: { ...v.options },
    priceCents: v.priceCents,
    compareAtCents: v.compareAtCents,
    availability: v.availability,
  };
}

const FORBIDDEN_KEYS = /^(adapter_?id|external_?(id|sku_?id|order_?ids?|ref)|supplier.*|cost(_?cents)?|active_?link|raw|store_?id)$/i;
const FORBIDDEN_TEXT = /aliexpress|alibaba|alicdn|aliexpress-media|1688\.com/i;

/** Throws if a value about to be sent to a customer contains supplier identifiers. */
export function assertNoSupplierLeak(value: unknown, path = "$"): void {
  if (typeof value === "string") {
    if (FORBIDDEN_TEXT.test(value)) throw new Error(`Supplier reference leaked at ${path}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertNoSupplierLeak(v, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.test(k)) throw new Error(`Supplier field "${k}" leaked at ${path}`);
      assertNoSupplierLeak(v, `${path}.${k}`);
    }
  }
}
