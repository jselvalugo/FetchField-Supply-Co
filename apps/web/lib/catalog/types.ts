import type { BlazeShape, Drawing, PriceTier, SpecRow } from "@fetchfield/ui";

export type Storefront = "pro" | "shop";

export interface Category {
  slug: string;
  storefront: Storefront;
  name: string;
  /** Two-letter trail code shown next to the blaze. */
  code: string;
  blaze: BlazeShape;
  /** One line for index lists. */
  blurb: string;
  /** Short paragraph at the top of the category page. */
  intro: string;
}

export interface Shot {
  brief: string;
  shotId: string;
  /** Set once we have a licensed photo. Until then a PhotoSlot renders. */
  src?: string;
}

export interface Download {
  kind: "spec" | "install" | "cad";
  label: string;
  format: string;
  /** Route or file URL. Null = available on request. */
  href: string | null;
}

export type ProPricing =
  | { kind: "tiers"; unit: string; tiers: PriceTier[] }
  | { kind: "custom"; reason: string; fromCents?: number };

export interface ProProduct {
  storefront: "pro";
  slug: string;
  name: string;
  category: string;
  model: string;
  summary: string;
  description: string[];
  highlights: string[];
  specs: SpecRow[];
  leadTime: string;
  pricing: ProPricing;
  drawing?: Drawing;
  shots: Shot[];
  downloads: Download[];
  related: string[];
  fieldNote?: { text: string; from: string };
  /** Consumable refills & parts shown as "Keeps it running". */
  consumables?: string[];
  service?: { perStationMonthlyCents: number; installCents: number };
}

export interface ShopColor {
  name: string;
  hex: string;
}

export interface ShopSize {
  label: string;
  /** Plain-language fit, e.g. "Neck 12–16 in" */
  fit: string;
}

export interface ShopVariant {
  sku: string;
  color?: string;
  size?: string;
  availability: "available" | "sold_out";
}

export interface ShopProduct {
  storefront: "shop";
  slug: string;
  name: string;
  category: string;
  summary: string;
  description: string[];
  priceCents: number;
  compareAtCents?: number;
  colors?: ShopColor[];
  sizes?: ShopSize[];
  variants: ShopVariant[];
  sizeGuide?: { note?: string; columns: string[]; rows: string[][] };
  materials: string[];
  care: string[];
  dogSizes: Array<"XS" | "S" | "M" | "L" | "XL">;
  /** Supplier transit window to the US, calendar days, from the last sync. */
  transit: { minDays: number; maxDays: number };
  shots: Shot[];
  weight?: string;
  fieldNote?: { text: string; from: string };
  pairsWith?: string[];
  isBundle?: { items: string[]; savesCents: number };
}

export type Product = ProProduct | ShopProduct;
