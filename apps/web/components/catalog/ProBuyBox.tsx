"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, PriceTierTable, buttonClass, tierFor } from "@fetchfield/ui";
import { QtyStepper } from "@/components/common/QtyStepper";
import { useLists } from "@/components/lists/ListsProvider";
import { usd } from "@/lib/format";
import type { ProPricing } from "@/lib/catalog/types";

export function ProBuyBox({ slug, name, model, pricing, leadTime }: {
  slug: string;
  name: string;
  model: string;
  pricing: ProPricing;
  leadTime: string;
}) {
  const { addToQuote, quote, ready } = useLists();
  const min = pricing.kind === "tiers" ? pricing.tiers[0]!.minQty : 1;
  const [qty, setQty] = useState(min);
  const [added, setAdded] = useState(false);
  const inQuote = ready && quote.some((l) => l.slug === slug);

  const add = () => {
    addToQuote({ slug, name, model, qty, unit: pricing.kind === "tiers" ? pricing.unit : "site", note: "" });
    setAdded(true);
  };

  return (
    <div className="buybox">
      {pricing.kind === "tiers" ? (
        <>
          <div>
            <p className="eyebrow m-0">Your price at this quantity</p>
            <p className="buybox__price m-0 mt-1">
              {usd(tierFor(pricing.tiers, qty).priceCents)} <span className="buybox__unit">{pricing.unit}</span>
            </p>
            <p className="m-0 mt-1 text-sm text-muted">
              Line total <span className="mono text-text">{usd(tierFor(pricing.tiers, qty).priceCents * qty)}</span> before tax and freight
            </p>
          </div>
          <PriceTierTable tiers={pricing.tiers} quantity={qty} unit={pricing.unit} />
        </>
      ) : (
        <div>
          <p className="eyebrow m-0">Priced per site</p>
          {pricing.fromCents ? (
            <p className="buybox__price m-0 mt-1">
              <span className="buybox__unit">Typical projects from</span> {usd(pricing.fromCents)}
            </p>
          ) : null}
          <p className="m-0 mt-2 text-sm">{pricing.reason}</p>
        </div>
      )}

      <div className="buybox__row">
        {pricing.kind === "tiers" && <QtyStepper value={qty} onChange={(n) => { setQty(n); setAdded(false); }} min={min} label={`Quantity (${pricing.unit})`} />}
        <Button size="lg" onClick={add} className="self-end grow">
          {inQuote ? "Add more to quote" : "Add to quote"}
        </Button>
      </div>

      <div aria-live="polite" className="min-h-6">
        {added && (
          <p className="added m-0">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><path d="M2 8.5 6 12l8-8" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
            Added {qty.toLocaleString()} to your quote list.{" "}
            <Link href="/pro/quote" className="link font-semibold">Review and submit</Link>
          </p>
        )}
      </div>

      <dl className="buybox__meta">
        <div><dt className="inline">Lead time: </dt><dd className="inline m-0"><strong>{leadTime}</strong></dd></div>
        <div><dt className="inline">Quotes: </dt><dd className="inline m-0">answered within 1 business day, valid 30 days</dd></div>
        <div><dt className="inline">Pay by: </dt><dd className="inline m-0">card, ACH, or PO on net-30 for approved accounts</dd></div>
      </dl>
      <Link href="/pro/account" className={buttonClass("quiet", "sm", "justify-self-start")}>Have an account? Order on account</Link>
    </div>
  );
}
