import { cx } from "./cx";

export interface PriceTier {
  minQty: number;
  /** Inclusive upper bound; null = and up. */
  maxQty: number | null;
  priceCents: number;
}

const usd = (c: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: c % 100 === 0 ? 0 : 2 }).format(c / 100);

export const tierFor = (tiers: PriceTier[], qty: number) =>
  tiers.find((t) => qty >= t.minQty && (t.maxQty === null || qty <= t.maxQty)) ?? tiers[0]!;

/** Quantity pricing, visible to everyone (spec §6). Highlights the tier the chosen quantity falls into. */
export function PriceTierTable({
  tiers,
  quantity,
  unit = "each",
  className,
}: {
  tiers: PriceTier[];
  quantity?: number;
  unit?: string;
  className?: string;
}) {
  const active = quantity ? tierFor(tiers, quantity) : null;
  const base = tiers[0]!.priceCents;
  return (
    <table className={cx("ff-tiers", className)}>
      <caption className="ff-sr">Price per unit by quantity</caption>
      <thead>
        <tr>
          <th scope="col">Qty</th>
          <th scope="col">Price {unit}</th>
          <th scope="col">Saves</th>
        </tr>
      </thead>
      <tbody>
        {tiers.map((t) => {
          const isActive = active === t;
          const save = base - t.priceCents;
          return (
            <tr key={t.minQty} className={isActive ? "is-active" : undefined} aria-current={isActive ? "true" : undefined}>
              <th scope="row">{t.maxQty === null ? `${t.minQty}+` : `${t.minQty}–${t.maxQty}`}</th>
              <td>{usd(t.priceCents)}</td>
              <td>{save > 0 ? `${Math.round((save / base) * 100)}%` : "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
