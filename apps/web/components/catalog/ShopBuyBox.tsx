"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Button, cx } from "@fetchfield/ui";
import { QtyStepper } from "@/components/common/QtyStepper";
import { useLists } from "@/components/lists/ListsProvider";
import { DeliveryEstimate } from "./DeliveryEstimate";
import { usd } from "@/lib/format";
import type { ShopColor, ShopSize, ShopVariant } from "@/lib/catalog/types";

export function ShopBuyBox({ slug, name, priceCents, compareAtCents, colors, sizes, variants, transit, returnDays }: {
  slug: string;
  name: string;
  priceCents: number;
  compareAtCents?: number;
  colors?: ShopColor[];
  sizes?: ShopSize[];
  variants: ShopVariant[];
  transit: { minDays: number; maxDays: number };
  returnDays: number;
}) {
  const uid = useId();
  const { addToCart } = useLists();
  const firstAvail = variants.find((v) => v.availability === "available") ?? variants[0]!;
  const [color, setColor] = useState<string | undefined>(firstAvail.color);
  const [size, setSize] = useState<string | undefined>(sizes ? undefined : firstAvail.size);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [needSize, setNeedSize] = useState(false);

  const variant = useMemo(() => variants.find((v) => v.color === color && v.size === size), [variants, color, size]);
  const allSoldOut = variants.every((v) => v.availability === "sold_out");
  const soldOut = variant?.availability === "sold_out";
  const sizeAvailable = (s: string) => variants.some((v) => v.size === s && v.color === color && v.availability === "available");
  const colorAvailable = (c: string) => variants.some((v) => v.color === c && v.availability === "available");

  const add = () => {
    if (sizes && !size) { setNeedSize(true); return; }
    if (!variant || soldOut) return;
    addToCart({ sku: variant.sku, slug, name, variant: [color, size].filter(Boolean).join(" · "), priceCents, qty });
    setAdded(true);
  };

  return (
    <div className="grid gap-5">
      <p className="m-0 flex items-baseline gap-2">
        <span className="buybox__price">{usd(priceCents)}</span>
        {compareAtCents ? (
          <span className="mono text-sm text-muted">
            <span className="ff-sr">Regular price </span><s>{usd(compareAtCents)}</s>
          </span>
        ) : null}
      </p>

      {colors && (
        <fieldset className="m-0 border-0 p-0">
          <legend className="label mb-2">Color: <span className="font-normal">{color}</span></legend>
          <div className="seg">
            {colors.map((c) => (
              <span key={c.name}>
                <input type="radio" id={`${uid}-c-${c.name}`} name={`${uid}-color`} checked={color === c.name}
                  onChange={() => { setColor(c.name); setAdded(false); }} />
                <label htmlFor={`${uid}-c-${c.name}`} className={cx(!colorAvailable(c.name) && "opacity-60")}>
                  <span className="swatch" style={{ background: c.hex }} aria-hidden />
                  {c.name}
                  {!colorAvailable(c.name) && <span className="text-xs text-muted">sold out</span>}
                </label>
              </span>
            ))}
          </div>
        </fieldset>
      )}

      {sizes && (
        <fieldset className="m-0 border-0 p-0" aria-describedby={needSize ? `${uid}-sz-err` : undefined}>
          <legend className="label mb-2">Size</legend>
          <div className="seg">
            {sizes.map((s) => (
              <span key={s.label}>
                <input type="radio" id={`${uid}-s-${s.label}`} name={`${uid}-size`} checked={size === s.label}
                  disabled={!sizeAvailable(s.label)} onChange={() => { setSize(s.label); setNeedSize(false); setAdded(false); }} />
                <label htmlFor={`${uid}-s-${s.label}`}>
                  <span className="font-semibold">{s.label}</span>
                  <span className="text-xs text-muted">{s.fit}</span>
                </label>
              </span>
            ))}
          </div>
          {needSize && <p id={`${uid}-sz-err`} className="error-text m-0 mt-2">Choose a size.</p>}
          <a href="#size-guide" className="link mt-2 inline-block text-sm">Size guide with measurements</a>
        </fieldset>
      )}

      <div className="buybox__row items-end">
        <QtyStepper value={qty} onChange={(n) => { setQty(n); setAdded(false); }} max={20} />
        <Button size="lg" onClick={add} disabled={allSoldOut || soldOut} className="grow">
          {allSoldOut || soldOut ? "Sold out" : "Add to cart"}
        </Button>
      </div>
      {(soldOut || allSoldOut) && (
        <p className="m-0 text-sm text-muted">
          {allSoldOut ? "Sold out everywhere we source it." : `${[color, size].filter(Boolean).join(" / ")} is sold out.`} We only list what's actually in stock, so we don't take orders we can't ship.
        </p>
      )}
      <div aria-live="polite" className="min-h-6">
        {added && (
          <p className="added m-0">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><path d="M2 8.5 6 12l8-8" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
            In your cart. <Link href="/shop/cart" className="link font-semibold">View cart</Link>
          </p>
        )}
      </div>

      <DeliveryEstimate minDays={transit.minDays} maxDays={transit.maxDays} />

      <ul className="m-0 grid list-none gap-1 border-t border-line p-0 pt-4 text-sm">
        <li><strong>Free shipping</strong> on orders over $50.</li>
        <li><strong>{returnDays}-day returns.</strong> For most returns you won't need to ship anything back. <Link href="/returns" className="link">How returns work</Link></li>
      </ul>
    </div>
  );
}
