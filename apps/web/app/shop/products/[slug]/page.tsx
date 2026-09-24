import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState, FieldNote } from "@fetchfield/ui";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { JsonLd } from "@/components/common/JsonLd";
import { Photo } from "@/components/common/Photo";
import { ProductCard } from "@/components/catalog/ProductCard";
import { ShopBuyBox } from "@/components/catalog/ShopBuyBox";
import { allSlugs, getCategory, getShopProduct, getShopProductsBySlugs } from "@/lib/catalog";
import { usd } from "@/lib/format";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return allSlugs().shop.map((slug) => ({ slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getShopProduct(slug);
  return p ? { title: p.name, description: p.summary, alternates: { canonical: `/shop/products/${p.slug}` } } : {};
}

export default async function ShopProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getShopProduct(slug);
  if (!p) notFound();
  const [cat, pairs, bundleItems] = await Promise.all([
    getCategory("shop", p.category),
    getShopProductsBySlugs(p.pairsWith ?? []),
    getShopProductsBySlugs(p.isBundle?.items ?? []),
  ]);
  const anyAvailable = p.variants.some((v) => v.availability === "available");

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.name,
          description: p.summary,
          sku: p.variants[0]?.sku,
          brand: { "@type": "Brand", name: "FetchField Shop" },
          offers: {
            "@type": "Offer",
            priceCurrency: "USD",
            price: (p.priceCents / 100).toFixed(2),
            availability: anyAvailable ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
            url: new URL(`/shop/products/${p.slug}`, site.url).toString(),
            hasMerchantReturnPolicy: {
              "@type": "MerchantReturnPolicy",
              applicableCountry: "US",
              returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
              merchantReturnDays: site.returnWindowDays,
            },
          },
        }}
      />
      <div className="wrap">
        <Breadcrumbs items={[{ label: "Shop", href: "/shop" }, ...(cat ? [{ label: cat.name, href: `/shop/${cat.slug}` }] : []), { label: p.name }]} />
        <div className="pdp">
          {/* PLACEHOLDER-PHOTO */}
          <div className="pdp__media">
            {p.shots.map((s, i) => <Photo key={s.shotId} shot={s} ratio={i === 0 ? "4 / 5" : "4 / 3"} priority={i === 0} />)}
          </div>
          <div className="pdp__buy">
            <h1 className="display display--wide pdp__title">{p.name}</h1>
            <p className="pdp__summary">{p.summary}</p>
            <ShopBuyBox
              slug={p.slug}
              name={p.name}
              priceCents={p.priceCents}
              compareAtCents={p.compareAtCents}
              colors={p.colors}
              sizes={p.sizes}
              variants={p.variants}
              transit={p.transit}
              returnDays={site.returnWindowDays}
            />
          </div>
        </div>
      </div>

      <section className="section border-t-2 border-text" aria-label="Product details">
        <div className="wrap grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div className="prose">
            <h2 className="mt-0">Details</h2>
            {p.description.map((d) => <p key={d.slice(0, 24)}>{d}</p>)}
            {p.isBundle && (
              <>
                <h3>In the kit</h3>
                <ul>
                  {bundleItems.map((b) => <li key={b.slug}><Link href={`/shop/products/${b.slug}`}>{b.name}</Link> <span className="mono text-sm text-muted">({usd(b.priceCents)} alone)</span></li>)}
                </ul>
                <p>Together {usd(p.priceCents)}, which saves {usd(p.isBundle.savesCents)} on buying them separately.</p>
              </>
            )}
            {p.sizeGuide && (
              <>
                <h3 id="size-guide">Size guide</h3>
                {p.sizeGuide.note && <p>{p.sizeGuide.note}</p>}
                <table>
                  <thead><tr>{p.sizeGuide.columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
                  <tbody>{p.sizeGuide.rows.map((r) => <tr key={r[0]}>{r.map((v, i) => i === 0 ? <th key={i} scope="row">{v}</th> : <td key={i} className="mono">{v}</td>)}</tr>)}</tbody>
                </table>
              </>
            )}
          </div>
          <div className="grid content-start gap-8">
            <dl className="ff-plate !p-5">
              {[
                ["Materials", p.materials.join(" · ")],
                ["Care", p.care.join(" · ")],
                ["Fits dogs", p.dogSizes.join(", ")],
                ...(p.weight ? [["Weight", p.weight]] : []),
                ["Ships", `Typically ${p.transit.minDays + 1}–${p.transit.maxDays + 2} days`],
              ].map(([k, v]) => (
                <div key={k} className="ff-plate__row"><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
            {p.fieldNote && <FieldNote from={p.fieldNote.from}><p>{p.fieldNote.text}</p></FieldNote>}
          </div>
        </div>
      </section>

      <section className="section border-t border-line bg-sunken" aria-labelledby="reviews">
        <div className="wrap grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 id="reviews" className="display display--wide m-0 text-3xl">Reviews</h2>
            <p className="text-sm text-muted">Only people who bought this item can review it. We ask 7 days after delivery and publish every review, good or bad, unedited.</p>
          </div>
          <EmptyState title="No reviews yet">
            <p className="m-0">This item is new to the Shop. The first reviews from verified buyers will appear here.</p>
          </EmptyState>
        </div>
      </section>

      {pairs.length > 0 && (
        <section className="wrap section" aria-labelledby="pairs">
          <h2 id="pairs" className="display display--wide m-0 mb-6 text-3xl">Goes with</h2>
          <div className="shop-grid">{pairs.map((x) => <ProductCard key={x.slug} p={x} />)}</div>
        </section>
      )}
    </>
  );
}
