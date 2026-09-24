"use client";

import { useId, useState } from "react";
import { DEFAULT_RULE, suggestPrice, marginAt } from "@fetchfield/suppliers/pricing";
import { usd } from "@/lib/format";

export function PricingCalculator() {
  const id = useId();
  const [cost, setCost] = useState("6.42");
  const [ship, setShip] = useState("0.00");
  const [override, setOverride] = useState("");
  const c = Math.round(Number(cost) * 100);
  const s = Math.round(Number(ship) * 100);
  const valid = Number.isFinite(c) && Number.isFinite(s) && c > 0 && s >= 0;
  const r = valid ? suggestPrice({ costCents: c, shippingCents: s }) : null;
  const o = valid && override && Number(override) > 0 ? marginAt(Math.round(Number(override) * 100), { costCents: c, shippingCents: s }, DEFAULT_RULE) : null;
  const show = o ?? r;
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="field"><label htmlFor={`${id}-c`}>Supplier cost</label><input id={`${id}-c`} className="input mono" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} /></div>
        <div className="field"><label htmlFor={`${id}-s`}>Shipping</label><input id={`${id}-s`} className="input mono" inputMode="decimal" value={ship} onChange={(e) => setShip(e.target.value)} /></div>
        <div className="field"><label htmlFor={`${id}-o`}>Your price</label><input id={`${id}-o`} className="input mono" inputMode="decimal" placeholder={r ? (r.priceCents / 100).toFixed(2) : ""} value={override} onChange={(e) => setOverride(e.target.value)} /></div>
      </div>
      {show ? (
        <dl className="ff-plate !p-4" aria-live="polite">
          {[
            ["Retail price", usd(show.priceCents), o ? "your override" : "suggested"],
            ["Cost + shipping", usd(show.breakdown.costCents + show.breakdown.shippingCents)],
            ["Handling reserve", usd(show.breakdown.handlingCents)],
            ["Card fees", usd(show.breakdown.paymentFeeCents), "2.9% + 30¢"],
            ["Profit", usd(show.breakdown.profitCents)],
            ["Margin", `${(show.margin * 100).toFixed(1)}%`, show.belowFloor ? `BELOW ${DEFAULT_RULE.marginFloor * 100}% FLOOR` : `floor ${DEFAULT_RULE.marginFloor * 100}%`],
          ].map(([k, v, n]) => (
            <div key={k} className="ff-plate__row"><dt>{k}</dt><dd className={k === "Margin" && show.belowFloor ? "text-danger" : undefined}>{v}{n ? <span className="ff-plate__note"> {n}</span> : null}</dd></div>
          ))}
        </dl>
      ) : (
        <p className="error-text m-0">Enter a cost above zero.</p>
      )}
      <p className="hint m-0">Target margin {DEFAULT_RULE.targetMargin * 100}%, rounded up to .00/.50/.95. The sync job hides a product if a cost change drops it under the floor.</p>
    </div>
  );
}
