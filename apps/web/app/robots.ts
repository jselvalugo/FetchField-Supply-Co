import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (site.noindex) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/shop/cart", "/shop/checkout", "/pro/quote", "/pro/account"] },
    sitemap: new URL("/sitemap.xml", site.url).toString(),
  };
}
