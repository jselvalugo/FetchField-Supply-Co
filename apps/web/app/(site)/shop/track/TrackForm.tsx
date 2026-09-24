"use client";

import { keep } from "@/components/common/keep-form";

import { useActionState, useId } from "react";
import { Button, EmptyState } from "@fetchfield/ui";
import { lookupOrder, type TrackState } from "@/lib/actions/track";
import { longDate } from "@/lib/format";

const STAGES = ["Order placed", "Processing", "Shipped", "Out for delivery", "Delivered"] as const;

export function TrackForm() {
  const uid = useId();
  const [state, action, pending] = useActionState<TrackState, FormData>(lookupOrder, { status: "idle" });
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
      <form action={action} onSubmit={keep(action)} className="grid content-start gap-4">
        <div className="field">
          <label htmlFor={`${uid}-o`}>Order number</label>
          <input id={`${uid}-o`} name="order" className="input mono" placeholder="FF-104275" autoComplete="off" required maxLength={20} />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-z`}>Shipping ZIP</label>
          <input id={`${uid}-z`} name="zip" className="input mono" inputMode="numeric" autoComplete="postal-code" required maxLength={10} />
        </div>
        <Button type="submit" disabled={pending}>{pending ? "Looking…" : "Find order"}</Button>
        <p className="hint m-0">Asking for the ZIP means nobody can look up your order with the number alone.</p>
      </form>
      <div aria-live="polite">
        {state.status === "idle" && (
          <ol className="timeline" aria-label="What tracking shows">
            {STAGES.map((s) => <li key={s}><span className="timeline__dot" /><span className="timeline__t text-muted">{s}</span></li>)}
          </ol>
        )}
        {state.status === "not_found" && (
          <EmptyState title="We couldn't find that order">
            <p className="m-0">Check the number in your receipt email. It starts with FF-. The ZIP must match the shipping address.</p>
          </EmptyState>
        )}
        {state.status === "found" && (
          <div className="grid gap-6">
            <div>
              <p className="eyebrow m-0">Order {state.order}</p>
              <p className="m-0 mt-1 text-xl font-semibold">{state.headline}</p>
              {state.eta && <p className="m-0 mt-1 text-muted">Expected <span className="mono">{longDate(new Date(state.eta.from))} – {longDate(new Date(state.eta.to))}</span></p>}
            </div>
            {state.tracking && (
              <p className="m-0 text-sm">Carrier <strong>{state.tracking.carrier}</strong> · tracking <span className="mono">{state.tracking.number}</span></p>
            )}
            <ol className="timeline">
              {state.events.map((e, i) => (
                <li key={i} className={e.done ? (i === state.events.findLastIndex((x) => x.done) ? "is-done is-now" : "is-done") : undefined}>
                  <span className="timeline__dot" />
                  <span className="timeline__t">{e.label}</span>
                  {e.at && <span className="timeline__d block">{longDate(new Date(e.at))}{e.where ? ` · ${e.where}` : ""}</span>}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
