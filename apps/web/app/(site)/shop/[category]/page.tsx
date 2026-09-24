import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { PageHead } from "@/components/common/PageHead";
import { ProductCard } from "@/components/catalog/ProductCard";
import { allSlugs, getCategory, getShopProducts } from "@/lib/catalog";
import { Listing } from "./Listing";

export function generateStaticParams() {
  return allSlugs().shopCategories.map((category) => ({ category }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const c = await getCategory("shop", category);
  return c ? { title: `${c.name}: ${c.blurb}`, description: c.intro, alternates: { canonical: `/shop/${c.slug}` } } : {};
}

export default async function ShopCategory({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const [c, products] = await Promise.all([getCategory("shop", category), getShopProducts(category)]);
  if (!c) notFound();
  const cards = Object.fromEntries(products.map((p) => [p.slug, <ProductCard key={p.slug} p={p} />]));
  return (
    <>
      <div className="wrap"><Breadcrumbs items={[{ label: "Shop", href: "/shop" }, { label: c.name }]} /></div>
      <PageHead eyebrow="FetchField Shop" code={c.code} blaze={c.blaze} title={c.name} lede={<p className="m-0">{c.intro}</p>} />
      <div className="wrap">
        <Listing products={products} cards={cards} />
      </div>
    </>
  );
}
