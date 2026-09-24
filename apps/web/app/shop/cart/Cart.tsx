"use client";

import Link from "next/link";
import { Button, EmptyState, Skeleton, buttonClass } from "@fetchfield/ui";
import { useLists } from "@/components/lists/ListsProvider";
import { QtyStepper } from "@/components/common/QtyStepper";
import { usd } from "@/lib/format";
import { site } from "@/lib/site";

export function Cart() {
  const { ready, cart, setCartQty, removeFromCart } = useLists();
  if (!ready) return <div className="grid gap-3" aria-busy="true">{[0, 1].map((i) => <Skeleton key={i} style={{ height: "6rem" }} />)}</div>;
  if (!cart.length) {
    return (
      <EmptyState title="Your cart is empty" action={<Link href="/shop" className={buttonClass("action")}>Browse the Shop</Link>}>
        <p className="m-0">Commercial equipment goes on a quote list instead. <Link href="/pro/quote" className="link">Open quote list</Link></p>
      </EmptyState>
    );
  }
  const subtotal = cart.reduce((s, l) => s + l.priceCents * l.qty, 0);
  const toFree = site.freeShippingCents - subtotal;
  const shipping = toFree <= 0 ? 0 : site.flatShippingCents;

  return (
    <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
      <ul className="lines">
        {cart.map((l) => (
          <li key={l.sku}>
            <div className="aspect-square w-full bg-sunken" aria-hidden />
            <div className="grid content-start gap-1">
              <Link href={`/shop/products/${l.slug}`} className="lines__name">{l.name}</Link>
              <span className="lines__sub">{l.variant || "One size"} · {l.sku}</span>
              <span className="mono text-sm">{usd(l.priceCents)} each</span>
            </div>
            <div className="col-start-2 md:col-start-auto"><QtyStepper value={l.qty} onChange={(n) => setCartQty(l.sku, n)} max={20} label={`Quantity of ${l.name}`} /></div>
            <div className="col-start-2 flex items-center justify-between gap-4 md:col-start-auto md:grid md:justify-items-end">
              <span className="mono font-semibold">{usd(l.priceCents * l.qty)}</span>
              <Button variant="quiet" size="sm" onClick={() => removeFromCart(l.sku)}>Remove<span className="ff-sr"> {l.name}</span></Button>
            </div>
          </li>
        ))}
      </ul>
      <aside className="summary" aria-label="Order summary">
        <dl>
          <div><dt>Subtotal</dt><dd>{usd(subtotal)}</dd></div>
          <div><dt>Shipping</dt><dd>{shipping ? usd(shipping) : "Free"}</dd></div>
          <div><dt>Tax</dt><dd className="!font-body text-sm text-muted">at checkout</dd></div>
          <div className="total"><dt>Estimated total</dt><dd>{usd(subtotal + shipping)}</dd></div>
        </dl>
        {toFree > 0 && (
          <div className="grid gap-1 text-sm">
            <span><span className="mono">{usd(toFree)}</span> more for free shipping</span>
            <span className="block h-1.5 bg-sunken"><span className="block h-full bg-brand" style={{ width: `${Math.min(100, (subtotal / site.freeShippingCents) * 100)}%` }} /></span>
          </div>
        )}
        <Link href="/shop/checkout" className={buttonClass("action", "lg", "mt-2")}>Check out</Link>
        <p className="m-0 text-xs text-muted">Guest checkout. Card, Apple Pay and Google Pay through Stripe.</p>
      </aside>
    </div>
  );
}
