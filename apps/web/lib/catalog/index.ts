import "server-only";
import { assertNoSupplierLeak } from "@fetchfield/suppliers/public";
import { proCategories, shopCategories, findCategory } from "./categories";
import { proProducts } from "./pro";
import { shopProducts } from "./shop";
import type { ProProduct, ShopProduct } from "./types";

/**
 * Catalog repository. Pages call these async functions only, so swapping the
 * sample data for Medusa (or any backend) touches this file and nothing else.
 * In development every response is checked for supplier data leaks.
 */
const guard = <T>(v: T): T => {
  if (process.env.NODE_ENV !== "production") assertNoSupplierLeak(v);
  return v;
};

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
  return guard(category ? proProducts.filter((p) => p.category === category) : proProducts);
}
export async function getProProduct(slug: string): Promise<ProProduct | null> {
  return guard(proProducts.find((p) => p.slug === slug) ?? null);
}
export async function getShopProducts(category?: string): Promise<ShopProduct[]> {
  return guard(category ? shopProducts.filter((p) => p.category === category) : shopProducts);
}
export async function getShopProduct(slug: string): Promise<ShopProduct | null> {
  return guard(shopProducts.find((p) => p.slug === slug) ?? null);
}
export async function getProProductsBySlugs(slugs: string[]) {
  return guard(slugs.map((s) => proProducts.find((p) => p.slug === s)).filter((p): p is ProProduct => Boolean(p)));
}
export async function getShopProductsBySlugs(slugs: string[]) {
  return guard(slugs.map((s) => shopProducts.find((p) => p.slug === s)).filter((p): p is ShopProduct => Boolean(p)));
}

/** Server-side price lookup for quote and checkout. Never trust prices sent from the browser. */
export function priceShopVariant(sku: string): { product: ShopProduct; priceCents: number; available: boolean } | null {
  for (const p of shopProducts) {
    const v = p.variants.find((x) => x.sku === sku);
    if (v) return { product: p, priceCents: p.priceCents, available: v.availability === "available" };
  }
  return null;
}
export function findProProduct(slug: string) {
  return proProducts.find((p) => p.slug === slug) ?? null;
}
export function allSlugs() {
  return {
    pro: proProducts.map((p) => p.slug),
    shop: shopProducts.map((p) => p.slug),
    proCategories: proCategories.map((c) => c.slug),
    shopCategories: shopCategories.map((c) => c.slug),
  };
}
