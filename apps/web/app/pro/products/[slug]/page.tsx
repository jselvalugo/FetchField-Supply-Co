import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FieldNote, OrthoDrawing, SpecPlate, TrailMarker } from "@fetchfield/ui";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { JsonLd } from "@/components/common/JsonLd";
import { Photo } from "@/components/common/Photo";
import { ProBuyBox } from "@/components/catalog/ProBuyBox";
import { ServiceAreaCheck } from "@/components/catalog/ServiceAreaCheck";
import { allSlugs, getCategory, getProProduct, getProProductsBySlugs } from "@/lib/catalog";
import { usd } from "@/lib/format";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return allSlugs().pro.map((slug) => ({ slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProProduct(slug);
  if (!p) return {};
  return { title: `${p.name} (${p.model})`, description: p.summary, alternates: { canonical: `/pro/products/${p.slug}` } };
}

export default async function ProProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProProduct(slug);
  if (!p) notFound();
  const [cat, related, consumables] = await Promise.all([
    getCategory("pro", p.category),
    getProProductsBySlugs(p.related.filter((s) => !p.consumables?.includes(s))),
    getProProductsBySlugs(p.consumables ?? []),
  ]);
  const tiers = p.pricing.kind === "tiers" ? p.pricing.tiers : null;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.name,
          sku: p.model,
          mpn: p.model,
          description: p.summary,
          brand: { "@type": "Brand", name: "FetchField Pro" },
          category: cat?.name,
          ...(tiers
            ? {
                offers: {
                  "@type": "AggregateOffer",
                  priceCurrency: "USD",
                  lowPrice: (tiers[tiers.length - 1]!.priceCents / 100).toFixed(2),
                  highPrice: (tiers[0]!.priceCents / 100).toFixed(2),
                  offerCount: tiers.length,
                  availability: "https://schema.org/PreOrder",
                  url: new URL(`/pro/products/${p.slug}`, site.url).toString(),
                },
              }
            : {}),
        }}
      />
      <div className="wrap">
        <Breadcrumbs items={[{ label: "Pro", href: "/pro" }, ...(cat ? [{ label: cat.name, href: `/pro/${cat.slug}` }] : []), { label: p.name }]} />
        <div className="pdp">
          <div className="pdp__media">
            {p.drawing ? <OrthoDrawing drawing={p.drawing} /> : null}
            {/* PLACEHOLDER-PHOTO */}
            <div className="grid gap-3 sm:grid-cols-2">
              {p.shots.map((s, i) => (
                <div key={s.shotId} className={i === 0 && !p.drawing ? "sm:col-span-2" : undefined}>
                  <Photo shot={s} ratio={i === 0 && !p.drawing ? "16 / 10" : "4 / 3"} priority={i === 0 && !p.drawing} />
                </div>
              ))}
            </div>
          </div>

          <div className="pdp__buy">
            <p className="pdp__model m-0 flex items-center gap-2">
              {cat && <TrailMarker shape={cat.blaze} size={12} />} {cat?.code} · Model {p.model}
            </p>
            <h1 className="display display--wide pdp__title">{p.name}</h1>
            <p className="pdp__summary">{p.summary}</p>
            <ul className="pdp__facts">
              {p.highlights.map((h) => <li key={h}>{h}</li>)}
            </ul>
            <ProBuyBox slug={p.slug} name={p.name} model={p.model} pricing={p.pricing} leadTime={p.leadTime} />
            {p.service && (
              <div className="mt-6 border-t-2 border-text pt-4">
                <p className="m-0 mb-3 text-sm">Optional install: <span className="mono">{usd(p.service.installCents)}</span> per station.</p>
                <ServiceAreaCheck />
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="section border-t-2 border-text bg-sunken" aria-labelledby="specs">
        <div className="wrap grid items-start gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 id="specs" className="ff-sr">Specifications</h2>
            <SpecPlate model={p.model} rows={p.specs} footer={<><span>Specs per manufacturer</span>{p.drawing && <span>DWG {p.drawing.number}</span>}</>} />
          </div>
          <div className="grid gap-8">
            <div className="prose">
              <h2 className="mt-0">About the {p.name}</h2>
              {p.description.map((d) => <p key={d.slice(0, 24)}>{d}</p>)}
            </div>
            <div>
              <h2 className="m-0 mb-3 text-lg font-semibold">Downloads</h2>
              <ul className="downloads">
                {p.downloads.map((d) => (
                  <li key={d.kind}>
                    <span className="downloads__kind" aria-hidden>{d.kind === "cad" ? "CAD" : d.kind === "install" ? "INS" : "SPEC"}</span>
                    <span>
                      <span className="font-semibold">{d.label}</span>
                      <span className="downloads__fmt">{d.format}</span>
                    </span>
                    {d.href ? (
                      <Link href={d.href} className="link text-sm font-semibold">Open<span className="ff-sr"> {d.label}</span></Link>
                    ) : (
                      <a href={`mailto:${site.quotesEmail}?subject=${encodeURIComponent(`${d.label} request: ${p.model}`)}`} className="link text-sm">
                        Request<span className="ff-sr"> {d.label}</span>
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            {p.fieldNote && <FieldNote from={p.fieldNote.from}><p>{p.fieldNote.text}</p></FieldNote>}
          </div>
        </div>
      </section>

      {(consumables.length > 0 || related.length > 0) && (
        <section className="section" aria-labelledby="related">
          <div className="wrap grid gap-12 lg:grid-cols-2">
            {consumables.length > 0 && (
              <div>
                <p className="eyebrow m-0">Keeps it running</p>
                <h2 id="related" className="display display--wide mt-2 mb-5 text-3xl">Refills &amp; consumables</h2>
                <RelatedList items={consumables} />
              </div>
            )}
            {related.length > 0 && (
              <div>
                <p className="eyebrow m-0">Often specified with</p>
                <h2 className="display display--wide mt-2 mb-5 text-3xl">Related equipment</h2>
                <RelatedList items={related} />
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}

function RelatedList({ items }: { items: Awaited<ReturnType<typeof getProProductsBySlugs>> }) {
  return (
    <ul className="m-0 list-none border-t-2 border-text p-0">
      {items.map((r) => (
        <li key={r.slug} className="border-b border-line">
          <Link href={`/pro/products/${r.slug}`} className="group grid grid-cols-[1fr_auto] items-baseline gap-4 py-4 no-underline">
            <span>
              <span className="font-semibold group-hover:underline">{r.name}</span>
              <span className="mono block text-xs text-muted">{r.model}</span>
            </span>
            <span className="mono text-sm">
              {r.pricing.kind === "tiers" ? <>from {usd(r.pricing.tiers[r.pricing.tiers.length - 1]!.priceCents)}</> : "Per site"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
