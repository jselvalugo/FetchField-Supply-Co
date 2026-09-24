import type { MetadataRoute } from "next";
import { allSlugs } from "@/lib/catalog";
import { articles } from "@/lib/field-notes";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const s = allSlugs();
  const paths = [
    "/", "/pro", "/shop", "/field-notes", "/pro/procurement", "/about", "/contact", "/shipping", "/returns", "/privacy", "/terms", "/accessibility",
    ...s.proCategories.map((c) => `/pro/${c}`),
    ...s.shopCategories.map((c) => `/shop/${c}`),
    ...s.pro.map((p) => `/pro/products/${p}`),
    ...s.shop.map((p) => `/shop/products/${p}`),
    ...articles.map((a) => `/field-notes/${a.slug}`),
  ];
  return paths.map((p) => ({ url: new URL(p, site.url).toString() }));
}
