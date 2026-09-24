import Link from "next/link";
import { Photo } from "@/components/common/Photo";
import { usd } from "@/lib/format";
import type { ShopProduct } from "@/lib/catalog/types";

export function ProductCard({ p, wide }: { p: ShopProduct; wide?: boolean }) {
  const soldOut = p.variants.every((v) => v.availability === "sold_out");
  const shot = p.shots[0]!;
  return (
    <Link href={`/shop/products/${p.slug}`} className={`pcard${wide ? " pcard--wide" : ""}`}>
      <div className="pcard__media">
        <Photo shot={shot} ratio={wide ? "16 / 9" : "4 / 5"} sizes="(min-width: 900px) 33vw, 50vw" />
        {p.isBundle && <span className="pcard__flag">Bundle · saves {usd(p.isBundle.savesCents)}</span>}
        {soldOut && <span className="pcard__flag">Sold out</span>}
      </div>
      <span className="pcard__name">{p.name}</span>
      <p className="pcard__summary">{p.summary}</p>
      <span className="pcard__row">
        <span className="pcard__price">
          {usd(p.priceCents)}
          {p.compareAtCents ? <span className="pcard__was"><span className="ff-sr">was </span>{usd(p.compareAtCents)}</span> : null}
        </span>
        {p.colors && (
          <span className="pcard__swatches" aria-label={`${p.colors.length} colors`}>
            {p.colors.map((c) => <span key={c.name} className="swatch" style={{ background: c.hex }} />)}
          </span>
        )}
      </span>
    </Link>
  );
}
