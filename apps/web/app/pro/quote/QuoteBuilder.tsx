"use client";

import Link from "next/link";
import { useActionState, useEffect, useId } from "react";
import { Button, EmptyState, ErrorState, Skeleton, buttonClass } from "@fetchfield/ui";
import { useLists } from "@/components/lists/ListsProvider";
import { QtyStepper } from "@/components/common/QtyStepper";
import { submitQuote, type QuoteState } from "@/lib/actions/quote";
import { usd } from "@/lib/format";

export function QuoteBuilder() {
  const { ready, quote, updateQuote, removeFromQuote, clearQuote } = useLists();
  const [state, action, pending] = useActionState<QuoteState, FormData>(submitQuote, { status: "idle" });
  const uid = useId();

  useEffect(() => {
    if (state.status === "ok") clearQuote();
  }, [state.status, clearQuote]);

  if (state.status === "ok") return <Submitted state={state} />;

  if (!ready) {
    return (
      <div className="grid gap-3" aria-busy="true" aria-label="Loading your quote list">
        {[0, 1, 2].map((i) => <Skeleton key={i} style={{ height: "5.5rem" }} />)}
      </div>
    );
  }

  if (quote.length === 0) {
    return (
      <EmptyState title="Your quote list is empty" action={<Link href="/pro" className={buttonClass("action")}>Browse Pro equipment</Link>}>
        <p className="m-0">Add products from any Pro page with "Add to quote". Your list stays in this browser until you submit it.</p>
      </EmptyState>
    );
  }

  const err = state.status === "error" ? state.fieldErrors : {};
  const f = (name: string) => ({ id: `${uid}-${name}`, name, "aria-invalid": Boolean(err[name]) || undefined, "aria-describedby": err[name] ? `${uid}-${name}-e` : undefined });
  const E = ({ name }: { name: string }) => (err[name] ? <p id={`${uid}-${name}-e`} className="error-text m-0">{err[name]}</p> : null);

  return (
    <form action={action} className="grid gap-12 lg:grid-cols-[1.4fr_1fr]" noValidate>
      <input type="hidden" name="lines" value={JSON.stringify(quote.map((l) => ({ slug: l.slug, qty: l.qty, note: l.note })))} />
      <div className="ff-sr" aria-hidden>
        <label htmlFor={`${uid}-website`}>Leave this empty</label>
        <input id={`${uid}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <section aria-labelledby={`${uid}-items`}>
        <h2 id={`${uid}-items`} className="m-0 mb-4 text-xl font-semibold">Items ({quote.length})</h2>
        <ul className="lines">
          {quote.map((l) => (
            <li key={l.slug} className="!grid-cols-1 md:!grid-cols-[1fr_auto]">
              <div className="grid gap-2">
                <Link href={`/pro/products/${l.slug}`} className="lines__name">{l.name}</Link>
                <span className="lines__sub">{l.model} · {l.unit}</span>
                <div className="field max-w-md">
                  <label htmlFor={`${uid}-n-${l.slug}`} className="!text-xs !font-normal text-muted">Note for this item (color, sign text, mounting)</label>
                  <input id={`${uid}-n-${l.slug}`} className="input !min-h-10 !py-2 text-sm" value={l.note} maxLength={500}
                    onChange={(e) => updateQuote(l.slug, { note: e.target.value })} />
                </div>
              </div>
              <div className="flex items-end gap-3 md:flex-col md:items-end">
                <QtyStepper value={l.qty} onChange={(n) => updateQuote(l.slug, { qty: n })} label={`Quantity of ${l.name}`} />
                <Button variant="quiet" size="sm" onClick={() => removeFromQuote(l.slug)}>Remove<span className="ff-sr"> {l.name}</span></Button>
              </div>
            </li>
          ))}
        </ul>
        {err.lines && <p className="error-text">{err.lines}</p>}
        <p className="mt-4 text-sm text-muted">Tier pricing is applied per product at the quantity you enter. Freight, tax and install are added to the final quote.</p>
      </section>

      <section aria-labelledby={`${uid}-who`} className="grid content-start gap-5 border-2 border-text bg-surface p-5 md:p-6">
        <h2 id={`${uid}-who`} className="m-0 text-xl font-semibold">Your organization</h2>
        {state.status === "error" && <ErrorState title={state.message} />}
        <div className="field">
          <label htmlFor={`${uid}-orgName`}>Organization name</label>
          <input className="input" autoComplete="organization" {...f("orgName")} required />
          <E name="orgName" />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-orgType`}>Organization type</label>
          <select className="select" defaultValue="" {...f("orgType")} required>
            <option value="" disabled>Choose one</option>
            <option value="city">City or county</option>
            <option value="parks">Parks &amp; recreation department</option>
            <option value="hoa">HOA / community association</option>
            <option value="apartment">Apartment community</option>
            <option value="contractor">Landscape or general contractor</option>
            <option value="other">Other</option>
          </select>
          <E name="orgType" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label htmlFor={`${uid}-buyerName`}>Your name</label>
            <input className="input" autoComplete="name" {...f("buyerName")} required />
            <E name="buyerName" />
          </div>
          <div className="field">
            <label htmlFor={`${uid}-buyerRole`}>Role <span className="hint">(optional)</span></label>
            <input className="input" autoComplete="organization-title" placeholder="e.g. Parks superintendent" {...f("buyerRole")} />
          </div>
          <div className="field">
            <label htmlFor={`${uid}-email`}>Email</label>
            <input className="input" type="email" autoComplete="email" {...f("email")} required />
            <E name="email" />
          </div>
          <div className="field">
            <label htmlFor={`${uid}-phone`}>Phone <span className="hint">(optional)</span></label>
            <input className="input" type="tel" autoComplete="tel" {...f("phone")} />
          </div>
          <div className="field">
            <label htmlFor={`${uid}-zip`}>Delivery ZIP</label>
            <input className="input mono" inputMode="numeric" autoComplete="postal-code" maxLength={10} {...f("zip")} required />
            <E name="zip" />
          </div>
          <div className="field">
            <label htmlFor={`${uid}-neededBy`}>Needed by <span className="hint">(optional)</span></label>
            <input className="input mono" type="date" {...f("neededBy")} />
            <E name="neededBy" />
          </div>
        </div>
        <fieldset className="m-0 border-0 p-0">
          <legend className="label mb-2">Do you need installation?</legend>
          <div className="seg">
            {(["yes", "no", "unsure"] as const).map((v) => (
              <span key={v}>
                <input type="radio" id={`${uid}-inst-${v}`} name="install" value={v} defaultChecked={v === "unsure"} />
                <label htmlFor={`${uid}-inst-${v}`}>{v === "unsure" ? "Not sure yet" : v === "yes" ? "Yes" : "No"}</label>
              </span>
            ))}
          </div>
        </fieldset>
        <fieldset className="m-0 border-0 p-0">
          <legend className="label mb-2">Tax-exempt?</legend>
          <div className="seg">
            {(["no", "yes"] as const).map((v) => (
              <span key={v}>
                <input type="radio" id={`${uid}-tax-${v}`} name="taxExempt" value={v} defaultChecked={v === "no"} />
                <label htmlFor={`${uid}-tax-${v}`}>{v === "yes" ? "Yes, we'll send a certificate" : "No"}</label>
              </span>
            ))}
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor={`${uid}-bidNumber`}>Bid or solicitation number <span className="hint">(optional)</span></label>
          <input className="input mono" {...f("bidNumber")} />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-notes`}>Anything else? <span className="hint">(site access, delivery hours, attachments to follow)</span></label>
          <textarea className="textarea" {...f("notes")} maxLength={2000} />
        </div>
        <Button type="submit" size="lg" disabled={pending} aria-disabled={pending}>
          {pending ? "Sending…" : "Submit quote request"}
        </Button>
        <p className="m-0 text-xs text-muted">We reply within 1 business day. Submitting doesn't commit you to buy. See our <Link href="/privacy" className="link">privacy policy</Link>.</p>
      </section>
    </form>
  );
}

function Submitted({ state }: { state: Extract<QuoteState, { status: "ok" }> }) {
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1fr]" role="status">
      <div>
        <p className="eyebrow m-0">Quote request received</p>
        <h2 className="display display--wide mt-2 text-4xl">Reference <span className="mono">{state.ref}</span></h2>
        <p className="lede">We've emailed a copy to <strong>{state.email}</strong>. You'll get a final quote with freight, tax and install within one business day, valid until <span className="mono">{state.expires}</span>.</p>
        <ol className="steps mt-8 !grid-cols-1">
          <li><span className="steps__n">Now</span><span className="steps__t">We check stock and freight</span><p>and confirm lead times with the manufacturer.</p></li>
          <li><span className="steps__n">Within 1 business day</span><span className="steps__t">You get the final quote</span><p>as a PDF with an accept link.</p></li>
          <li><span className="steps__n">When you accept</span><span className="steps__t">It becomes an order</span><p>Pay by card or ACH, or send a PO if you're on net-30 terms.</p></li>
        </ol>
      </div>
      <div className="summary">
        <p className="eyebrow m-0">Draft, list pricing</p>
        <ul className="m-0 grid list-none gap-2 p-0">
          {state.lines.map((l) => (
            <li key={l.model} className="flex justify-between gap-4 border-b border-line pb-2 text-sm">
              <span>{l.qty.toLocaleString()} × {l.name}</span>
              <span className="mono">{l.lineCents === null ? "per site" : usd(l.lineCents)}</span>
            </li>
          ))}
        </ul>
        <dl>
          <div className="total"><dt>Subtotal</dt><dd>{usd(state.subtotalCents)}{state.hasCustom ? " + site-priced items" : ""}</dd></div>
        </dl>
        <p className="m-0 text-xs text-muted">Before tax, freight and install. Not an offer until we send the final quote.</p>
        <Link href="/pro" className={buttonClass("secondary", "md", "mt-2")}>Back to Pro equipment</Link>
      </div>
    </div>
  );
}
