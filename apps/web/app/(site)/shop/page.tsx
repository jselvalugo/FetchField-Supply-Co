import type { Metadata } from "next";
import Link from "next/link";
import { FieldNote, TrailMarker } from "@fetchfield/ui";
import { ProductCard } from "@/components/catalog/ProductCard";
import { Photo } from "@/components/common/Photo";
import { getShopCategories, getShopProducts } from "@/lib/catalog";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "FetchField Shop: leashes, bowls and park gear",
  description: "Dog gear we sample and test before listing. Real delivery dates by ZIP, 30-day returns, free shipping over $50.",
  alternates: { canonical: "/shop" },
};

export default async function ShopHome() {
  const [cats, products] = await Promise.all([getShopCategories(), getShopProducts()]);
  const kit = products.find((p) => p.slug === "park-day-kit");
  const rest = products.filter((p) => p.slug !== "park-day-kit");

  return (
    <>
      <section className="border-b-2 border-text">
        <div className="wrap grid gap-8 py-10 lg:grid-cols-[1fr_1.2fr] lg:items-end lg:py-16">
          <div>
            <p className="eyebrow m-0">FetchField Shop</p>
            <h1 className="display display--wide display--caps mt-3 mb-5 text-5xl md:text-7xl">Gear for the walk to the park</h1>
            <p className="lede m-0">Leashes, bowls and field gear. We sample and test every item, write our own descriptions and measure sizes ourselves.</p>
            <dl className="split__facts mt-8 max-w-lg">
              <div><dt>Delivery</dt><dd>Dates by ZIP on every item</dd></div>
              <div><dt>Shipping</dt><dd>Free over ${site.freeShippingCents / 100}</dd></div>
              <div><dt>Returns</dt><dd>{site.returnWindowDays} days</dd></div>
              <div><dt>Reviews</dt><dd>Verified buyers only</dd></div>
            </dl>
          </div>
          {/* PLACEHOLDER-PHOTO */}
          <Photo shot={{ shotId: "SHOP-01", brief: "Owner and scruffy mixed-breed on a wet field path, leash slack, dog looking back at camera." }} ratio="5 / 4" priority />
        </div>
      </section>

      <nav aria-label="Shop categories" className="border-b border-line">
        <div className="wrap">
        <ul className="m-0 grid list-none grid-cols-2 gap-0 p-0 sm:grid-cols-3 lg:grid-cols-6">
          {cats.map((c) => (
            <li key={c.slug} className="border-line max-lg:border-b">
              <Link href={`/shop/${c.slug}`} className="group flex h-full flex-col gap-1 py-5 pr-4 no-underline">
                <span className="flex items-center gap-2 font-semibold group-hover:underline">
                  <TrailMarker shape={c.blaze} size={14} /> {c.name}
                </span>
                <span className="text-sm text-muted">{c.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
        </div>
      </nav>

      <section className="wrap section" aria-labelledby="all">
        <div className="sec-head">
          <h2 id="all" className="display display--wide">Everything in the Shop</h2>
          <p className="mono m-0 text-sm text-muted">{products.length} items</p>
        </div>
        <div className="shop-grid shop-grid--4">
          {kit && <ProductCard p={kit} wide />}
          {rest.map((p) => <ProductCard key={p.slug} p={p} />)}
        </div>
      </section>

      <section className="section border-t-2 border-text bg-sunken" aria-labelledby="how">
        <div className="wrap grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="eyebrow m-0">How an item gets into the Shop</p>
            <h2 id="how" className="display display--wide mt-2 mb-8 text-4xl">Sampled, measured, rewritten</h2>
            <ol className="steps">
              <li><span className="steps__n">01</span><span className="steps__t">We order a sample</span><p>from a vetted maker and check materials against what's claimed.</p></li>
              <li><span className="steps__n">02</span><span className="steps__t">We use it</span><p>at the park, in the rain, in the car, for weeks.</p></li>
              <li><span className="steps__n">03</span><span className="steps__t">We measure it</span><p>and publish sizes in inches and centimetres.</p></li>
              <li><span className="steps__n">04</span><span className="steps__t">We write it up</span><p>in our own words, including what it's not good at.</p></li>
            </ol>
          </div>
          <FieldNote from="Product testing, FetchField" className="self-end">
            <p>If an item needed a disclaimer to sound good, we didn't list it.</p>
          </FieldNote>
        </div>
      </section>
    </>
  );
}
