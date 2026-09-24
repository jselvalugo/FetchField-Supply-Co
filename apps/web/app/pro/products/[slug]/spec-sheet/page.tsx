import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo, OrthoDrawing, PriceTierTable, SpecPlate } from "@fetchfield/ui";
import { PrintButton } from "./PrintButton";
import { allSlugs, getProProduct } from "@/lib/catalog";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return allSlugs().pro.map((slug) => ({ slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProProduct(slug);
  return p ? { title: `Spec sheet: ${p.name} (${p.model})`, robots: { index: false } } : {};
}

/** Printable one-page spec sheet. "Save as PDF" from the print dialog gives buyers a file for the bid packet. */
export default async function SpecSheet({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProProduct(slug);
  if (!p) notFound();
  return (
    <div className="spec-sheet wrap py-8">
      <div className="spec-sheet__actions mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <PrintButton />
        <p className="m-0 text-sm text-muted">Choose "Save as PDF" in the print dialog for a file you can attach to a bid.</p>
      </div>
      <article className="grid gap-6">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-text pb-4">
          <Logo />
          <div className="text-right">
            <p className="mono m-0 text-sm">Model {p.model}</p>
            <p className="mono m-0 text-xs text-muted">Spec sheet · {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short" })}</p>
          </div>
        </header>
        <div>
          <h1 className="display display--wide m-0 text-4xl">{p.name}</h1>
          <p className="lede mt-2">{p.summary}</p>
        </div>
        {p.drawing && <OrthoDrawing drawing={p.drawing} />}
        <div className="grid items-start gap-6 md:grid-cols-[1.3fr_1fr]">
          <SpecPlate model={p.model} rows={p.specs} />
          <div className="grid gap-4">
            {p.pricing.kind === "tiers" ? (
              <div>
                <h2 className="m-0 mb-2 text-base font-semibold">List pricing, {p.pricing.unit}</h2>
                <PriceTierTable tiers={p.pricing.tiers} unit={p.pricing.unit} />
                <p className="mt-2 text-xs text-muted">Before tax and freight. Quotes valid 30 days.</p>
              </div>
            ) : (
              <p className="m-0 text-sm">{p.pricing.reason}</p>
            )}
            <p className="m-0 text-sm">Quotes: {site.quotesEmail}<br />{site.url.replace(/^https?:\/\//, "")}/pro/products/{p.slug}</p>
          </div>
        </div>
      </article>
    </div>
  );
}
