"use client";

import { useEffect, useId, useState } from "react";
import { estimateDelivery, isValidZip } from "@fetchfield/suppliers/delivery";
import { longDate } from "@/lib/format";

const KEY = "ff_zip";

/**
 * Delivery by ZIP (spec §7, §8.6): supplier transit from the last sync plus our
 * processing time, always shown as a range.
 */
export function DeliveryEstimate({ minDays, maxDays }: { minDays: number; maxDays: number }) {
  const id = useId();
  const [zip, setZip] = useState("");
  const [shown, setShown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && isValidZip(saved)) {
        setZip(saved);
        setShown(saved);
      }
    } catch { /* storage blocked */ }
  }, []);

  let range: ReturnType<typeof estimateDelivery> | null = null;
  if (shown) {
    try {
      range = estimateDelivery({ transitMinDays: minDays, transitMaxDays: maxDays, orderedAt: new Date(), zip: shown });
    } catch { range = null; }
  }

  return (
    <div className="delivery">
      <form
        className="delivery__form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!isValidZip(zip)) { setError("Enter a 5-digit US ZIP."); return; }
          setError(null);
          setShown(zip.trim());
          try { localStorage.setItem(KEY, zip.trim()); } catch { /* ignore */ }
        }}
      >
        <div className="field">
          <label htmlFor={id}>Delivery to ZIP</label>
          <input id={id} className="input" inputMode="numeric" autoComplete="postal-code" maxLength={10}
            value={zip} onChange={(e) => setZip(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={`${id}-out`} />
        </div>
        <button type="submit" className="ff-btn ff-btn--secondary ff-btn--md">Check</button>
      </form>
      <div id={`${id}-out`} aria-live="polite" className="delivery__result">
        {error && <p className="error-text m-0">{error}</p>}
        {!error && range && (
          <>
            <p className="m-0">
              Arrives <span className="delivery__range">{longDate(range.earliest)} – {longDate(range.latest)}</span> to <span className="mono">{shown}</span>
            </p>
            <p className="hint m-0 mt-1">
              Includes 1–2 business days to process your order.{range.remoteSurchargeDays ? ` Adds ${range.remoteSurchargeDays} days for your region.` : ""} If it's going to be late, we'll email you and you can cancel for a full refund.
            </p>
          </>
        )}
        {!error && !range && <p className="hint m-0">Typically {minDays + 1}–{maxDays + 2} days. Enter your ZIP for dates.</p>}
      </div>
    </div>
  );
}
