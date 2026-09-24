import Link from "next/link";
import { notFound } from "next/navigation";
import { applyPro, applyShop, baseCatalog } from "@/lib/catalog";
import { getOverrides } from "@/lib/server/data";
import { resetProduct, saveProProduct, saveShopProduct } from "@/lib/actions/admin";
import { usd } from "@/lib/format";

export const metadata = { title: "Edit product" };

const dollars = (c: number | undefined | null) => (c === undefined || c === null ? "" : (c / 100).toFixed(2));
const ERR: Record<string, string> = {
  price: "Enter a price of at least $1.00.",
  compareAt: "The \"was\" price must be higher than the price, or left empty. Anything else is a fake discount.",
  transit: "Transit days must be whole numbers, 0–60, with the minimum no higher than the maximum.",
  tiers: "Each tier needs a starting quantity and a price, quantities can't repeat, and bigger tiers can't cost more per unit.",
};

export default async function EditProduct({ params, searchParams }: { params: Promise<{ storefront: string; slug: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { storefront, slug } = await params;
  const { saved, error } = await searchParams;
  const o = await getOverrides();
  const errors = (error ?? "").split(",").filter(Boolean);

  const Shell = ({ name, view, children }: { name: string; view: string; children: React.ReactNode }) => (
    <>
      <header className="adm-head">
        <div><p className="eyebrow m-0"><Link href="/admin/products" className="link">Products</Link> / {storefront === "pro" ? "Pro" : "Shop"}</p><h1 className="display display--wide">{name}</h1></div>
        <Link href={view} target="_blank" className="ff-btn ff-btn--secondary ff-btn--sm">View on site</Link>
      </header>
      {saved && <p className="adm-flash" role="status">Saved. The live site updates within a few seconds.</p>}
      {errors.length > 0 && <div className="ff-error mb-5" role="alert"><div><p className="ff-error__title">Not saved</p><ul className="m-0 mt-1 pl-5 text-sm">{errors.map((e) => <li key={e}>{ERR[e] ?? e}</li>)}</ul></div></div>}
      {children}
      <form action={resetProduct} className="mt-6">
        <input type="hidden" name="storefront" value={storefront} /><input type="hidden" name="slug" value={slug} />
        <button type="submit" className="ff-btn ff-btn--quiet ff-btn--sm">Reset to catalog defaults</button>
      </form>
    </>
  );

  if (storefront === "shop") {
    const base = baseCatalog().shop.find((p) => p.slug === slug);
    if (!base) notFound();
    const e = o.shop[slug];
    const live = applyShop(base, { ...o, shop: { ...o.shop, [slug]: { ...e, hidden: false } } })!;
    return (
      <Shell name={base.name} view={`/shop/products/${slug}`}>
        <form action={saveShopProduct} className="adm-grid-2">
          <input type="hidden" name="slug" value={slug} />
          <section className="adm-panel">
            <div className="adm-panel__h"><h2>Listing</h2></div>
            <div className="adm-panel__b grid gap-5">
              <label className="check"><input type="checkbox" name="visible" defaultChecked={!e?.hidden} /> <span><strong>Visible on the site</strong><br /><span className="text-sm text-muted">Unchecked hides the product everywhere, including search and category pages.</span></span></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="field"><label htmlFor="price">Price (USD)</label><input id="price" name="price" inputMode="decimal" defaultValue={dollars(live.priceCents)} className="input mono" aria-invalid={errors.includes("price")} /></div>
                <div className="field"><label htmlFor="compareAt">Was price <span className="hint">(optional)</span></label><input id="compareAt" name="compareAt" inputMode="decimal" defaultValue={dollars(live.compareAtCents)} className="input mono" aria-invalid={errors.includes("compareAt")} /></div>
              </div>
              <div className="field"><label htmlFor="summary">One-line summary</label><input id="summary" name="summary" maxLength={240} defaultValue={e?.summary ?? ""} placeholder={base.summary} className="input" /><p className="hint m-0">Leave empty to use the catalog text.</p></div>
              <fieldset className="m-0 border-0 p-0">
                <legend className="label mb-2">Supplier transit to the US (days)</legend>
                <div className="flex items-center gap-2">
                  <input aria-label="Minimum days" name="transitMin" inputMode="numeric" defaultValue={live.transit.minDays} className="input mono !w-20" aria-invalid={errors.includes("transit")} />
                  <span>to</span>
                  <input aria-label="Maximum days" name="transitMax" inputMode="numeric" defaultValue={live.transit.maxDays} className="input mono !w-20" aria-invalid={errors.includes("transit")} />
                </div>
                <p className="hint m-0 mt-1">Feeds the delivery estimate. Normally set by the supplier sync.</p>
              </fieldset>
            </div>
          </section>
          <section className="adm-panel">
            <div className="adm-panel__h"><h2>Stock by variant</h2><span className="text-sm text-muted">Tick to mark sold out</span></div>
            <ul className="adm-panel__b m-0 grid list-none gap-2">
              {live.variants.map((v) => (
                <li key={v.sku}>
                  <label className="check">
                    <input type="checkbox" name="soldOut" value={v.sku} defaultChecked={v.availability === "sold_out"} />
                    <span>{[v.color, v.size].filter(Boolean).join(" / ") || "Standard"} <span className="mono text-xs text-muted">{v.sku}</span></span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="adm-panel__b border-t border-line"><button type="submit" className="ff-btn ff-btn--action ff-btn--md w-full">Save changes</button></div>
          </section>
        </form>
      </Shell>
    );
  }

  if (storefront === "pro") {
    const base = baseCatalog().pro.find((p) => p.slug === slug);
    if (!base) notFound();
    const e = o.pro[slug];
    const live = applyPro(base, { ...o, pro: { ...o.pro, [slug]: { ...e, hidden: false } } })!;
    const tiers = live.pricing.kind === "tiers" ? live.pricing.tiers : [];
    return (
      <Shell name={base.name} view={`/pro/products/${slug}`}>
        <form action={saveProProduct} className="adm-grid-2">
          <input type="hidden" name="slug" value={slug} />
          <section className="adm-panel">
            <div className="adm-panel__h"><h2>Listing</h2><span className="mono text-xs text-muted">{base.model}</span></div>
            <div className="adm-panel__b grid gap-5">
              <label className="check"><input type="checkbox" name="visible" defaultChecked={!e?.hidden} /> <span><strong>Visible on the site</strong><br /><span className="text-sm text-muted">Unchecked hides it from categories and returns "not found" on its page.</span></span></label>
              <div className="field"><label htmlFor="summary">One-line summary</label><input id="summary" name="summary" maxLength={240} defaultValue={e?.summary ?? ""} placeholder={base.summary} className="input" /></div>
              <div className="field"><label htmlFor="leadTime">Lead time</label><input id="leadTime" name="leadTime" maxLength={60} defaultValue={e?.leadTime ?? ""} placeholder={base.leadTime} className="input" /></div>
            </div>
          </section>
          <section className="adm-panel">
            <div className="adm-panel__h"><h2>{live.pricing.kind === "tiers" ? "Quantity pricing" : "Custom pricing"}</h2>{live.pricing.kind === "tiers" && <span className="text-sm text-muted">{live.pricing.unit}</span>}</div>
            <div className="adm-panel__b grid gap-3">
              {live.pricing.kind === "tiers" ? (
                <>
                  <div className="grid grid-cols-[1fr_1fr] gap-3 text-xs font-semibold uppercase tracking-[.12em] text-muted"><span>From qty</span><span>Price each (USD)</span></div>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr] gap-3">
                      <input aria-label={`Tier ${i + 1} starting quantity`} name={`tier${i}min`} inputMode="numeric" defaultValue={tiers[i]?.minQty ?? ""} className="input mono" aria-invalid={errors.includes("tiers")} />
                      <input aria-label={`Tier ${i + 1} price`} name={`tier${i}price`} inputMode="decimal" defaultValue={dollars(tiers[i]?.priceCents)} className="input mono" aria-invalid={errors.includes("tiers")} />
                    </div>
                  ))}
                  <p className="hint m-0">Leave a row empty to drop that tier. Each tier runs up to the next one's starting quantity. Currently: {tiers.map((t) => `${t.minQty}${t.maxQty ? `–${t.maxQty}` : "+"} at ${usd(t.priceCents)}`).join(" · ")}</p>
                </>
              ) : (
                <div className="field"><label htmlFor="customReason">Why it's priced per site</label><textarea id="customReason" name="customReason" defaultValue={e?.customReason ?? ""} placeholder={live.pricing.reason} className="textarea" maxLength={600} /></div>
              )}
              <button type="submit" className="ff-btn ff-btn--action ff-btn--md mt-2">Save changes</button>
            </div>
          </section>
        </form>
      </Shell>
    );
  }
  notFound();
}
