"use client";

import Link from "next/link";
import { useActionState, useEffect, useId } from "react";
import { Button, EmptyState, ErrorState, Skeleton, buttonClass } from "@fetchfield/ui";
import { useLists } from "@/components/lists/ListsProvider";
import { startCheckout, type CheckoutState } from "@/lib/actions/checkout";
import { usd } from "@/lib/format";
import { site } from "@/lib/site";

export function Checkout() {
  const uid = useId();
  const { ready, cart, removeFromCart } = useLists();
  const [state, action, pending] = useActionState<CheckoutState, FormData>(startCheckout, { status: "idle" });

  useEffect(() => {
    if (state.status === "redirect") window.location.assign(state.url);
  }, [state]);

  if (!ready) return <Skeleton style={{ height: "16rem" }} />;
  if (!cart.length) {
    return <EmptyState title="Nothing to check out" action={<Link href="/shop" className={buttonClass("action")}>Browse the Shop</Link>} />;
  }
  const subtotal = cart.reduce((s, l) => s + l.priceCents * l.qty, 0);
  const shipping = subtotal >= site.freeShippingCents ? 0 : site.flatShippingCents;

  return (
    <form action={action} className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
      <input type="hidden" name="lines" value={JSON.stringify(cart.map((l) => ({ sku: l.sku, qty: l.qty })))} />
      <div className="grid content-start gap-6">
        {state.status === "error" && (
          <ErrorState title={state.message}>
            {state.problems?.length ? (
              <ul className="m-0 mt-2 grid gap-2 p-0">
                {state.problems.map((p) => {
                  const line = cart.find((l) => l.sku === p.sku);
                  return (
                    <li key={p.sku} className="flex flex-wrap items-center gap-3">
                      <span>{line?.name ?? p.sku} ({line?.variant}) is {p.reason}.</span>
                      <Button variant="quiet" size="sm" onClick={() => removeFromCart(p.sku)}>Remove</Button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </ErrorState>
        )}
        <div className="field max-w-md">
          <label htmlFor={`${uid}-email`}>Email for your receipt and tracking</label>
          <input id={`${uid}-email`} name="email" type="email" autoComplete="email" className="input" required />
          <p className="hint m-0">No account needed. We'll only email you about this order unless you opt in later.</p>
        </div>
        <div className="grid gap-2 border-t-2 border-text pt-4 text-sm">
          <p className="m-0"><strong>Next:</strong> you'll enter your address and payment on Stripe's secure checkout page. Card, Apple Pay and Google Pay are accepted.</p>
          <p className="m-0 text-muted">We check stock again when you pay. If anything is late we email you before the date we promised, and you can cancel for a full refund.</p>
        </div>
      </div>
      <aside className="summary" aria-label="Order summary">
        <ul className="m-0 grid list-none gap-2 p-0">
          {cart.map((l) => (
            <li key={l.sku} className="flex justify-between gap-4 border-b border-line pb-2 text-sm">
              <span>{l.qty} × {l.name}<span className="block text-xs text-muted">{l.variant}</span></span>
              <span className="mono">{usd(l.priceCents * l.qty)}</span>
            </li>
          ))}
        </ul>
        <dl>
          <div><dt>Subtotal</dt><dd>{usd(subtotal)}</dd></div>
          <div><dt>Shipping</dt><dd>{shipping ? usd(shipping) : "Free"}</dd></div>
          <div className="total"><dt>Before tax</dt><dd>{usd(subtotal + shipping)}</dd></div>
        </dl>
        <Button type="submit" size="lg" disabled={pending || state.status === "redirect"}>
          {pending || state.status === "redirect" ? "Opening secure checkout…" : "Continue to payment"}
        </Button>
        <p className="m-0 text-xs text-muted">Prices are confirmed on our server before payment. By continuing you agree to our <Link href="/terms" className="link">terms of sale</Link>.</p>
      </aside>
    </form>
  );
}
