import Link from "next/link";
import { TrailMarker } from "@fetchfield/ui";
import { applyPro, applyShop, baseCatalog, getProCategories, getShopCategories } from "@/lib/catalog";
import { getOverrides } from "@/lib/server/data";
import { usd } from "@/lib/format";

export const metadata = { title: "Products" };

export default async function Products() {
  const [o, proCats, shopCats] = await Promise.all([getOverrides(), getProCategories(), getShopCategories()]);
  const { pro, shop } = baseCatalog();
  const status = (hidden: boolean | undefined, edited: boolean) => (
    <span className={`badge ${hidden ? "badge--muted" : "badge--ok"}`}>{hidden ? "Hidden" : "Live"}{edited && !hidden ? " · edited" : ""}</span>
  );
  return (
    <>
      <header className="adm-head">
        <div><p className="eyebrow m-0">Catalog</p><h1 className="display display--wide">Products</h1></div>
        <p className="m-0 max-w-md text-sm text-muted">Change prices, visibility and stock here. Changes show on the site within seconds. New Shop products come in through Suppliers.</p>
      </header>
      {[
        { title: "FetchField Pro", store: "pro" as const, rows: pro.map((p) => {
          const live = applyPro(p, o);
          const cat = proCats.find((c) => c.slug === p.category);
          const price = (live ?? p).pricing;
          return { slug: p.slug, name: p.name, sub: `${p.model} · ${cat?.name}`, blaze: cat?.blaze, hidden: o.pro[p.slug]?.hidden, edited: Boolean(o.pro[p.slug]),
            price: price.kind === "tiers" ? `${usd(price.tiers[0]!.priceCents)} → ${usd(price.tiers[price.tiers.length - 1]!.priceCents)}` : "Per site", extra: (live ?? p).leadTime };
        }) },
        { title: "FetchField Shop", store: "shop" as const, rows: shop.map((p) => {
          const live = applyShop(p, o) ?? p;
          const cat = shopCats.find((c) => c.slug === p.category);
          const out = live.variants.filter((v) => v.availability === "sold_out").length;
          return { slug: p.slug, name: p.name, sub: cat?.name ?? "", blaze: cat?.blaze, hidden: o.shop[p.slug]?.hidden, edited: Boolean(o.shop[p.slug]),
            price: usd(live.priceCents), extra: out ? `${out} of ${live.variants.length} variants sold out` : `${live.variants.length} variants in stock` };
        }) },
      ].map((g) => (
        <section key={g.store} className="adm-panel mb-6" aria-labelledby={`h-${g.store}`}>
          <div className="adm-panel__h"><h2 id={`h-${g.store}`}>{g.title}</h2><span className="text-sm text-muted">{g.rows.length} products</span></div>
          <div className="adm-scroll">
            <table className="adm-table">
              <thead><tr><th scope="col">Product</th><th scope="col">Status</th><th scope="col" className="num">Price</th><th scope="col">{g.store === "pro" ? "Lead time" : "Stock"}</th><th scope="col"><span className="ff-sr">Edit</span></th></tr></thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.slug}>
                    <td>
                      <span className="flex items-center gap-2">{r.blaze && <TrailMarker shape={r.blaze} size={11} />}<Link href={`/admin/products/${g.store}/${r.slug}`}>{r.name}</Link></span>
                      <div className="text-xs text-muted">{r.sub}</div>
                    </td>
                    <td>{status(r.hidden, r.edited)}</td>
                    <td className="num">{r.price}</td>
                    <td className="text-sm text-muted">{r.extra}</td>
                    <td className="text-right"><Link href={`/admin/products/${g.store}/${r.slug}`} className="ff-btn ff-btn--secondary ff-btn--sm">Edit<span className="ff-sr"> {r.name}</span></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
