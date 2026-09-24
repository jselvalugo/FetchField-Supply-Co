"use client";

import { useMemo, useState } from "react";
import { Button, EmptyState } from "@fetchfield/ui";
import type { ShopProduct } from "@/lib/catalog/types";

/**
 * Client-side filters (spec §7: size, material, color, price, dog size).
 * Cards are rendered on the server and passed in, so filtering only hides
 * or shows them; no extra JavaScript per product.
 */
export function Listing({ products, cards }: { products: ShopProduct[]; cards: Record<string, React.ReactNode> }) {
  const colors = useMemo(() => [...new Set(products.flatMap((p) => p.colors?.map((c) => c.name) ?? []))], [products]);
  const dogSizes = ["XS", "S", "M", "L", "XL"].filter((s) => products.some((p) => p.dogSizes.includes(s as never)));
  const [color, setColor] = useState<string | null>(null);
  const [dog, setDog] = useState<string | null>(null);
  const [price, setPrice] = useState<"all" | "u20" | "20-40" | "o40">("all");
  const [inStock, setInStock] = useState(false);

  const shown = products.filter((p) => {
    if (color && !p.colors?.some((c) => c.name === color)) return false;
    if (dog && !p.dogSizes.includes(dog as never)) return false;
    if (price === "u20" && p.priceCents >= 2000) return false;
    if (price === "20-40" && (p.priceCents < 2000 || p.priceCents > 4000)) return false;
    if (price === "o40" && p.priceCents <= 4000) return false;
    if (inStock && !p.variants.some((v) => v.availability === "available")) return false;
    return true;
  });
  const reset = () => { setColor(null); setDog(null); setPrice("all"); setInStock(false); };
  const active = color || dog || price !== "all" || inStock;

  const Seg = ({ name, value, label, checked, onChange }: { name: string; value: string; label: string; checked: boolean; onChange: () => void }) => (
    <span>
      <input type="radio" id={`f-${name}-${value}`} name={name} checked={checked} onChange={onChange} />
      <label htmlFor={`f-${name}-${value}`}>{label}</label>
    </span>
  );

  return (
    <div className="listing">
      <form className="filters" aria-label="Filter products" onSubmit={(e) => e.preventDefault()}>
        {dogSizes.length > 1 && (
          <fieldset>
            <legend>Dog size</legend>
            <div className="seg">
              <Seg name="dog" value="any" label="Any" checked={!dog} onChange={() => setDog(null)} />
              {dogSizes.map((s) => <Seg key={s} name="dog" value={s} label={s} checked={dog === s} onChange={() => setDog(s)} />)}
            </div>
          </fieldset>
        )}
        {colors.length > 1 && (
          <fieldset>
            <legend>Color</legend>
            <div className="seg">
              <Seg name="color" value="any" label="Any" checked={!color} onChange={() => setColor(null)} />
              {colors.map((c) => <Seg key={c} name="color" value={c} label={c} checked={color === c} onChange={() => setColor(c)} />)}
            </div>
          </fieldset>
        )}
        <fieldset>
          <legend>Price</legend>
          <div className="seg">
            <Seg name="price" value="all" label="Any" checked={price === "all"} onChange={() => setPrice("all")} />
            <Seg name="price" value="u20" label="Under $20" checked={price === "u20"} onChange={() => setPrice("u20")} />
            <Seg name="price" value="20-40" label="$20–40" checked={price === "20-40"} onChange={() => setPrice("20-40")} />
            <Seg name="price" value="o40" label="Over $40" checked={price === "o40"} onChange={() => setPrice("o40")} />
          </div>
        </fieldset>
        <label className="check"><input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} /> In stock only</label>
        {active && <Button variant="quiet" size="sm" onClick={reset} className="justify-self-start">Clear filters</Button>}
      </form>
      <div>
        <p className="listing__meta" aria-live="polite">
          <span><span className="mono">{shown.length}</span> of {products.length} items</span>
        </p>
        {shown.length ? (
          <div className="shop-grid">{shown.map((p) => <div key={p.slug}>{cards[p.slug]}</div>)}</div>
        ) : (
          <EmptyState title="Nothing matches those filters" action={<Button variant="secondary" onClick={reset}>Clear filters</Button>}>
            <p className="m-0">Try a different size or color. We'd rather show you nothing than something that won't fit.</p>
          </EmptyState>
        )}
      </div>
    </div>
  );
}
