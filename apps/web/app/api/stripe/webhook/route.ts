import { NextResponse, type NextRequest } from "next/server";
import { audit, linkSession, newOrderId, orderIdForSession, saveOrder, type OrderRecord } from "@/lib/server/data";
import { verifyStripeSignature } from "@/lib/server/stripe-signature";

/**
 * Records paid Stripe Checkout sessions as orders (Admin → Orders).
 * Set STRIPE_WEBHOOK_SECRET and point a Stripe webhook for
 * checkout.session.completed at /api/stripe/webhook.
 */
interface Session {
  id: string;
  payment_status: string;
  customer_details?: { email?: string; name?: string; address?: Address } | null;
  shipping_details?: { name?: string; address?: Address } | null;
  collected_information?: { shipping_details?: { name?: string; address?: Address } | null } | null;
  amount_subtotal?: number;
  amount_total?: number;
  total_details?: { amount_shipping?: number; amount_tax?: number } | null;
  metadata?: Record<string, string>;
}
interface Address { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string }

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  const raw = await req.text();
  if (!verifyStripeSignature(raw, req.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  const event = JSON.parse(raw) as { type: string; data: { object: Session } };
  if (event.type !== "checkout.session.completed") return NextResponse.json({ ok: true, ignored: event.type });
  const s = event.data.object;
  if (s.payment_status !== "paid") return NextResponse.json({ ok: true, ignored: "unpaid" });
  if (await orderIdForSession(s.id)) return NextResponse.json({ ok: true, duplicate: true });

  // Line items with our SKUs come from Stripe, not from the event payload.
  const items: OrderRecord["items"] = [];
  const key = process.env.STRIPE_SECRET_KEY;
  if (key) {
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(s.id)}/line_items?limit=100&expand[]=data.price.product`, {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return NextResponse.json({ error: "line items unavailable" }, { status: 502 }); // Stripe retries
    const li = (await res.json()) as { data: Array<{ description: string; quantity: number; price: { unit_amount: number; product: { metadata?: { sku?: string } } } }> };
    for (const l of li.data) items.push({ sku: l.price.product.metadata?.sku ?? "", name: l.description, qty: l.quantity, unitCents: l.price.unit_amount });
  }

  const ship = s.collected_information?.shipping_details ?? s.shipping_details ?? null;
  const now = new Date().toISOString();
  const id = s.metadata?.order && /^FF-\d{6}$/.test(s.metadata.order) ? s.metadata.order : newOrderId();
  const order: OrderRecord = {
    id,
    stripeSessionId: s.id,
    createdAt: now,
    status: "paid",
    email: s.customer_details?.email ?? "",
    shipTo: ship?.address
      ? { name: ship.name ?? "", line1: ship.address.line1 ?? "", line2: ship.address.line2 ?? "", city: ship.address.city ?? "", state: ship.address.state ?? "", zip: ship.address.postal_code ?? "" }
      : null,
    items,
    subtotalCents: s.amount_subtotal ?? 0,
    shippingCents: s.total_details?.amount_shipping ?? 0,
    taxCents: s.total_details?.amount_tax ?? 0,
    totalCents: s.amount_total ?? 0,
    tracking: null,
    internalNote: "",
    history: [{ at: now, event: "Paid" }],
  };
  await saveOrder(order);
  await linkSession(s.id, id);
  await audit("order_paid", `${id} ${(order.totalCents / 100).toFixed(2)}`);
  return NextResponse.json({ ok: true, order: id });
}
