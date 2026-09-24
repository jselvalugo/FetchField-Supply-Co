import Link from "next/link";
import { TrailMarker } from "@fetchfield/ui";
import { usd } from "@/lib/format";
import type { Category, ProProduct } from "@/lib/catalog/types";

/** Dense, desktop-first product list for Pro categories: the hardware-catalog look. */
export function CatalogTable({ products, categories }: { products: ProProduct[]; categories: Category[] }) {
  return (
    <table className="catalog-table">
      <caption className="ff-sr">Products</caption>
      <thead>
        <tr>
          <th scope="col" className="catalog-row__thumb"><span className="ff-sr">Category</span></th>
          <th scope="col">Product</th>
          <th scope="col" className="num">Lead time</th>
          <th scope="col" className="num">1 unit</th>
          <th scope="col" className="num">Best tier</th>
        </tr>
      </thead>
      <tbody>
        {products.map((p) => {
          const cat = categories.find((c) => c.slug === p.category);
          const tiers = p.pricing.kind === "tiers" ? p.pricing.tiers : null;
          const last = tiers?.[tiers.length - 1];
          return (
            <tr key={p.slug}>
              <td className="catalog-row__thumb">
                {cat && (
                  <span className="inline-flex items-center gap-1.5 mono text-xs text-muted">
                    <TrailMarker shape={cat.blaze} size={14} /> {cat.code}
                  </span>
                )}
              </td>
              <td>
                <Link href={`/pro/products/${p.slug}`} className="catalog-row__name">{p.name}</Link>
                <div className="catalog-row__model">{p.model}</div>
                <p className="catalog-row__summary">{p.summary}</p>
              </td>
              <td className="num" data-label="Lead">{p.leadTime.replace(/^Ships in /, "")}</td>
              <td className="num" data-label="From">
                {tiers ? <>{usd(tiers[0]!.priceCents)}<span className="block text-xs text-muted">{p.pricing.kind === "tiers" ? p.pricing.unit : ""}</span></> : <span className="text-muted">Per site</span>}
              </td>
              <td className="num" data-label="Tier">
                {last ? <>{usd(last.priceCents)}<span className="block text-xs text-muted">at {last.minQty.toLocaleString()}+</span></> : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
