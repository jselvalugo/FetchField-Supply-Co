import "server-only";
import { assertNoSupplierLeak } from "@fetchfield/suppliers/public";
import { getOverrides, type CatalogOverrides } from "@/lib/server/data";
import { proCategories, shopCategories, findCategory } from "./categories";
import { proProducts } from "./pro";
import { shopProducts } from "./shop";
import type { ProProduct, ShopProduct } from "./types";

/**
 * Catalog repository. Pages call these async functions only. The base catalog
 * (pro.ts / shop.ts) is merged with admin edits from storage, so price,
 * visibility and stock changes made in /admin show up without a deploy.
 * In development every response is checked for supplier data leaks.
 */
const guard = <T>(v: T): T => {
  if (process.env.NODE_ENV !== "production") assertNoSupplierLeak(v);
  return v;
};

export function applyPro(p: ProProduct, o: CatalogOverrides): ProProduct | null {
  const e = o.pro[p.slug];
  if (!e) return p;
  if (e.hidden) return null;
  let pricing = p.pricing;
  if (e.tiers && pricing.kind === "tiers" && e.tiers.length) pricing = { ...pricing, tiers: e.tiers };
  if (e.customReason && pricing.kind === "custom") pricing = { ...pricing, reason: e.customReason };
  return { ...p, summary: e.summary || p.summary, leadTime: e.leadTime || p.leadTime, pricing };
}

export function applyShop(p: ShopProduct, o: CatalogOverrides): ShopProduct | null {
  const e = o.shop[p.slug];
  if (!e) return p;
  if (e.hidden) return null;
  const soldOut = new Set(e.soldOut ?? []);
  return {
    ...p,
    summary: e.summary || p.summary,
    priceCents: e.priceCents ?? p.priceCents,
    compareAtCents: e.compareAtCents === null ? undefined : (e.compareAtCents ?? p.compareAtCents),
    transit: e.transit ?? p.transit,
    variants: e.soldOut ? p.variants.map((v) => ({ ...v, availability: soldOut.has(v.sku) ? "sold_out" : "available" })) : p.variants,
  };
}

async function pro(): Promise<ProProduct[]> {
  const o = await getOverrides();
  return proProducts.map((p) => applyPro(p, o)).filter((p): p is ProProduct => p !== null);
}
async function shop(): Promise<ShopProduct[]> {
  const o = await getOverrides();
  return shopProducts.map((p) => applyShop(p, o)).filter((p): p is ShopProduct => p !== null);
}

export async function getProCategories() {
  return guard(proCategories);
}
export async function getShopCategories() {
  return guard(shopCategories);
}
export async function getCategory(storefront: "pro" | "shop", slug: string) {
  return guard(findCategory(storefront, slug) ?? null);
}
export async function getProProducts(category?: string): Promise<ProProduct[]> {
  const all = await pro();
  return guard(category ? all.filter((p) => p.category === category) : all);
}
export async function getProProduct(slug: string): Promise<ProProduct | null> {
  return guard((await pro()).find((p) => p.slug === slug) ?? null);
}
export async function getShopProducts(category?: string): Promise<ShopProduct[]> {
  const all = await shop();
  return guard(category ? all.filter((p) => p.category === category) : all);
}
export async function getShopProduct(slug: string): Promise<ShopProduct | null> {
  return guard((await shop()).find((p) => p.slug === slug) ?? null);
}
export async function getProProductsBySlugs(slugs: string[]) {
  const all = await pro();
  return guard(slugs.map((s) => all.find((p) => p.slug === s)).filter((p): p is ProProduct => Boolean(p)));
}
export async function getShopProductsBySlugs(slugs: string[]) {
  const all = await shop();
  return guard(slugs.map((s) => all.find((p) => p.slug === s)).filter((p): p is ShopProduct => Boolean(p)));
}

/** Server-side price lookup for checkout. Never trust prices sent from the browser. */
export async function priceShopVariant(sku: string): Promise<{ product: ShopProduct; priceCents: number; available: boolean } | null> {
  for (const p of await shop()) {
    const v = p.variants.find((x) => x.sku === sku);
    if (v) return { product: p, priceCents: p.priceCents, available: v.availability === "available" };
  }
  return null;
}
export async function findProProduct(slug: string) {
  return (await pro()).find((p) => p.slug === slug) ?? null;
}

/** Base catalog including hidden items, for the admin screens. */
export function baseCatalog() {
  return { pro: proProducts, shop: shopProducts };
}

export function allSlugs() {
  return {
    pro: proProducts.map((p) => p.slug),
    shop: shopProducts.map((p) => p.slug),
    proCategories: proCategories.map((c) => c.slug),
    shopCategories: shopCategories.map((c) => c.slug),
  };
}
