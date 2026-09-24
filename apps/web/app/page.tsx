import Link from "next/link";
import { FieldNote, OrthoDrawing, SpecPlate, TrailMarker, buttonClass } from "@fetchfield/ui";
import { Photo } from "@/components/common/Photo";
import { ProductCard } from "@/components/catalog/ProductCard";
import { JsonLd } from "@/components/common/JsonLd";
import { getProCategories, getProProduct, getProProducts, getShopProductsBySlugs } from "@/lib/catalog";
import { site } from "@/lib/site";
import { articles } from "@/lib/field-notes";

export default async function Home() {
  const [cats, station, allPro, featured] = await Promise.all([
    getProCategories(),
    getProProduct("park-station-400"),
    getProProducts(),
    getShopProductsBySlugs(["park-day-kit", "trail-leash-6ft", "field-harness", "collapsible-bowl", "field-ball-2pk"]),
  ]);
  const counts = new Map(cats.map((c) => [c.slug, allPro.filter((p) => p.category === c.slug).length]));

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Organization", name: site.name, url: site.url, email: site.quotesEmail }} />

      {/* Split entry: one brand, two ways in (spec §5) */}
      <section className="split" aria-label="Choose a store">
        <Link href="/pro" className="split__panel turf on-dark">
          <div>
            <p className="split__who eyebrow m-0">
              <TrailMarker shape="square" tone="chalk" size={14} /> FetchField Pro · Parks, HOAs, apartments
            </p>
          </div>
          <div>
            <h1 className="display display--wide display--caps split__title">
              For parks<br />&amp; properties
            </h1>
            <p className="split__copy">
              Waste stations, agility courses, fountains and fencing. Every product lists dimensions, materials, lead time and quantity pricing.
            </p>
            <dl className="split__facts mt-8">
              <div><dt>Stations</dt><dd>from $329 at 20+</dd></div>
              <div><dt>Quotes</dt><dd>answered in 1 business day</dd></div>
              <div><dt>Payment</dt><dd>Card, ACH, PO net-30</dd></div>
              <div><dt>Paperwork</dt><dd>W-9 &amp; COI on file</dd></div>
            </dl>
            {/* PLACEHOLDER-PHOTO */}
            <div className="split__photo">
              <Photo shot={{ shotId: "HOME-01", brief: "Waste station at a city dog park entrance, dogs and owners passing, early light." }} ratio="16 / 7" tone="dark" priority />
            </div>
          </div>
          <span className="split__go">Browse Pro equipment <span className="split__arrow" aria-hidden /></span>
        </Link>

        <Link href="/shop" className="split__panel split__panel--shop">
          <div>
            <p className="split__who eyebrow m-0">
              <TrailMarker shape="circle" size={14} /> FetchField Shop · Dog owners
            </p>
          </div>
          <div>
            <h2 className="display display--wide display--caps split__title">
              For your<br />dog
            </h2>
            <p className="split__copy">
              Leashes, bowls and park gear. We order a sample of everything and test it at the park before it goes on sale.
            </p>
            <dl className="split__facts mt-8">
              <div><dt>Delivery</dt><dd>Real dates by ZIP</dd></div>
              <div><dt>Returns</dt><dd>{site.returnWindowDays} days, most without shipping back</dd></div>
              <div><dt>Shipping</dt><dd>Free over $50</dd></div>
              <div><dt>Reviews</dt><dd>Verified buyers only</dd></div>
            </dl>
            {/* PLACEHOLDER-PHOTO */}
            <div className="split__photo">
              <Photo shot={{ shotId: "HOME-02", brief: "Muddy retriever on a trail leash mid-shake, owner laughing, overcast park." }} ratio="16 / 7" />
            </div>
          </div>
          <span className="split__go">Shop gear <span className="split__arrow" aria-hidden /></span>
        </Link>
      </section>

      {/* What we promise, in plain numbers */}
      <section className="section border-y-2 border-text" aria-labelledby="promise">
        <div className="wrap grid gap-10 lg:grid-cols-[1.1fr_2fr]">
          <h2 id="promise" className="display display--wide m-0 text-4xl lg:text-5xl">We know the park, and we know the dog.</h2>
          <ol className="steps">
            <li>
              <span className="steps__n">01</span>
              <span className="steps__t">Specs on every page</span>
              <p>Dimensions in inches and millimetres, materials, mounting, warranty, origin and lead time.</p>
            </li>
            <li>
              <span className="steps__n">02</span>
              <span className="steps__t">Prices you can see</span>
              <p>Quantity tiers are public. We only say "priced per site" when a site plan really changes the price.</p>
            </li>
            <li>
              <span className="steps__n">03</span>
              <span className="steps__t">Dates, not promises</span>
              <p>Delivery is a range from real carrier times. If it slips, we tell you and you can cancel.</p>
            </li>
            <li>
              <span className="steps__n">04</span>
              <span className="steps__t">Nothing untested</span>
              <p>We order a sample of every Shop product and use it before listing, then write our own description.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* Pro: trail map + featured spec plate */}
      <section className="section" aria-labelledby="pro-index">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <p className="eyebrow m-0">FetchField Pro</p>
              <h2 id="pro-index" className="display display--wide">Everything a dog park needs</h2>
            </div>
            <Link href="/pro" className={buttonClass("secondary")}>All Pro equipment</Link>
          </div>
          <ul className="trailmap trailmap--3">
            {cats.map((c) => (
              <li key={c.slug}>
                <Link href={`/pro/${c.slug}`}>
                  <TrailMarker shape={c.blaze} size={18} />
                  <span className="trailmap__code">{c.code}</span>
                  <span>
                    <span className="trailmap__name">{c.name}</span>
                    <span className="trailmap__blurb">{c.blurb}</span>
                  </span>
                  <span className="trailmap__count">{counts.get(c.slug) ?? 0}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {station && station.drawing && (
        <section className="section bg-sunken" aria-labelledby="featured">
          <div className="wrap grid items-start gap-10 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="eyebrow m-0">Most-specified station</p>
              <h2 id="featured" className="display display--wide mt-2 mb-4 text-4xl">{station.name}</h2>
              <p className="lede mb-6">{station.summary}</p>
              <OrthoDrawing drawing={station.drawing} />
            </div>
            <div className="grid gap-6">
              <SpecPlate model={station.model} rows={station.specs.slice(0, 7)} footer={<><span>Spec sheet on product page</span><span>DWG {station.drawing.number}</span></>} />
              <div className="flex flex-wrap gap-3">
                <Link href={`/pro/products/${station.slug}`} className={buttonClass("action", "lg")}>See pricing &amp; add to quote</Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Shop */}
      <section className="section" aria-labelledby="shop-feat">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <p className="eyebrow m-0">FetchField Shop</p>
              <h2 id="shop-feat" className="display display--wide">Tested at the park first</h2>
            </div>
            <Link href="/shop" className={buttonClass("secondary")}>Shop all gear</Link>
          </div>
          <div className="shop-grid shop-grid--4">
            {featured.map((p, i) => <ProductCard key={p.slug} p={p} wide={i === 0} />)}
          </div>
        </div>
      </section>

      {/* Field notes */}
      <section className="section border-t-2 border-text" aria-labelledby="notes">
        <div className="wrap grid gap-10 lg:grid-cols-[2fr_1fr]">
          <div>
            <p className="eyebrow m-0">Field notes</p>
            <h2 id="notes" className="display display--wide mt-2 mb-6 text-4xl">Answers from people who install this stuff</h2>
            <ul className="m-0 list-none border-t-2 border-text p-0">
              {articles.map((a) => (
                <li key={a.slug} className="border-b border-line">
                  <Link href={`/field-notes/${a.slug}`} className="group grid gap-1 py-5 no-underline sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-6">
                    <span className="text-xl font-semibold group-hover:underline">{a.title}</span>
                    <span className="mono text-xs text-muted">{a.readMinutes} min · {a.audience}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <FieldNote from="FetchField install crew" className="self-start">
            <p>Put the station on the exit side of the gate, not the entrance. People pick up on the way out.</p>
          </FieldNote>
        </div>
      </section>

      {/* Procurement */}
      <section className="turf turf--field on-dark" aria-labelledby="proc">
        <div className="wrap section grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-end">
          <h2 id="proc" className="display display--wide m-0 text-4xl lg:text-5xl">The paperwork a city buyer needs, ready to download.</h2>
          <div className="grid gap-6">
            <ul className="m-0 grid list-none gap-0 p-0 sm:grid-cols-2">
              {["W-9 and certificate of insurance", "Tax-exempt certificates accepted", "Net-30 terms for approved accounts", "Bid and solicitation numbers on quotes"].map((t) => (
                <li key={t} className="flex items-center gap-3 border-t border-line py-3 pr-4">
                  <TrailMarker shape="square" tone="chalk" size={10} /> {t}
                </li>
              ))}
            </ul>
            <div><Link href="/pro/procurement" className={buttonClass("inverse", "lg")}>Procurement documents</Link></div>
          </div>
        </div>
      </section>
    </>
  );
}
