import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, TrailMarker, buttonClass } from "@fetchfield/ui";
import { PageHead } from "@/components/common/PageHead";
import { CatalogTable } from "@/components/catalog/CatalogTable";
import { getProCategories, getProProducts } from "@/lib/catalog";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "FetchField Pro: dog park equipment for parks, HOAs and apartments",
  description: "Pet waste stations, bags, agility, fountains, fencing and surfacing with published specs, tier pricing and quotes in one business day.",
  alternates: { canonical: "/pro" },
};

export default async function ProHome() {
  const [cats, products] = await Promise.all([getProCategories(), getProProducts()]);
  const count = (slug: string) => products.filter((p) => p.category === slug).length;
  const popular = ["park-station-400", "header-bags-case", "a-frame-climb", "pedestal-fountain", "double-gate-entry"]
    .map((s) => products.find((p) => p.slug === s)!)
    .filter(Boolean);

  return (
    <>
      <PageHead
        dark
        eyebrow="FetchField Pro · for parks & properties"
        title="Park equipment, specified."
        lede={<p className="m-0">Stations, agility, water and fencing for cities, parks departments, HOAs and apartment communities. Every product lists dimensions, materials, lead time and quantity pricing, and quotes come back within {site.quoteResponse}.</p>}
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/pro/quote" className={buttonClass("action", "lg")}>Start a quote</Link>
          <Link href="/pro/procurement" className={buttonClass("inverse", "lg")}>W-9, COI &amp; terms</Link>
        </div>
      </PageHead>

      <section className="section" aria-labelledby="cats">
        <div className="wrap grid gap-12 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <p className="eyebrow m-0">Trail map</p>
            <h2 id="cats" className="display display--wide mt-2 text-4xl">Categories</h2>
            <p className="text-muted">Blazes follow a simple key: circles for stations and consumables, triangles for play, squares for site infrastructure, diamonds for services.</p>
          </div>
          <ul className="trailmap">
            {cats.map((c) => (
              <li key={c.slug}>
                <Link href={`/pro/${c.slug}`}>
                  <TrailMarker shape={c.blaze} size={18} />
                  <span className="trailmap__code">{c.code}</span>
                  <span>
                    <span className="trailmap__name">{c.name}</span>
                    <span className="trailmap__blurb">{c.blurb}</span>
                  </span>
                  <span className="trailmap__count" aria-label={`${count(c.slug)} products`}>{count(c.slug)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section border-t-2 border-text bg-sunken" aria-labelledby="how">
        <div className="wrap">
          <p className="eyebrow m-0">How buying works</p>
          <h2 id="how" className="display display--wide mt-2 mb-8 text-4xl">From quote list to installed</h2>
          <ol className="steps">
            <li><span className="steps__n">Step 1</span><span className="steps__t">Build a quote list</span><p>Add products with quantities, delivery ZIP, needed-by date and whether you need install.</p></li>
            <li><span className="steps__n">Step 2</span><span className="steps__t">Submit with your details</span><p>Organization, tax-exempt status and a bid or solicitation number if you have one. You get a reference number right away.</p></li>
            <li><span className="steps__n">Step 3</span><span className="steps__t">Get a final quote</span><p>Within {site.quoteResponse}: freight, tax and install priced. PDF plus an accept link, valid 30 days.</p></li>
            <li><span className="steps__n">Step 4</span><span className="steps__t">Accept and pay</span><p>Card, ACH, or a PO on net-30 for approved accounts. We send tracking and install scheduling.</p></li>
          </ol>
        </div>
      </section>

      <section className="section" aria-labelledby="popular">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <p className="eyebrow m-0">Most requested</p>
              <h2 id="popular" className="display display--wide">What parks order first</h2>
            </div>
          </div>
          <CatalogTable products={popular} categories={cats} />
        </div>
      </section>

      <section className="section border-t-2 border-text" aria-labelledby="projects">
        <div className="wrap grid gap-8 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <p className="eyebrow m-0">Installed parks</p>
            <h2 id="projects" className="display display--wide mt-2 text-4xl">Case studies</h2>
          </div>
          <EmptyState title="No case studies published yet" action={<Link href="/pro/quote" className={buttonClass("secondary")}>Start a quote</Link>}>
            <p className="m-0">We only publish installs we can name, with the owner's permission and real before-and-after numbers. The first ones will be here after our first installs.</p>
          </EmptyState>
        </div>
      </section>
    </>
  );
}
