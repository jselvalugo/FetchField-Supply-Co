"use server";

import { z } from "zod";
import { priceShopVariant } from "@/lib/catalog";
import { rateLimit } from "@/lib/server/rate-limit";
import { site } from "@/lib/site";

const Input = z.object({
  email: z.string().trim().email("Enter a valid email address").max(200),
  lines: z
    .array(z.object({ sku: z.string().regex(/^[A-Z0-9-]{3,60}$/), qty: z.number().int().min(1).max(20) }))
    .min(1, "Your cart is empty")
    .max(50),
});

export type CheckoutState =
  | { status: "idle" }
  | { status: "error"; message: string; problems?: Array<{ sku: string; reason: string }> }
  | { status: "redirect"; url: string };

/**
 * Starts a Stripe Checkout session. Prices come from the catalog on the
 * server; the browser only sends SKUs and quantities. Stripe handles card
 * data, Apple Pay / Google Pay and address collection, so no payment details
 * ever touch our servers.
 */
export async function startCheckout(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  if (!(await rateLimit("checkout", 20, 10 * 60_000))) return { status: "error", message: "Too many attempts. Wait a few minutes and try again." };
  let lines: unknown;
  try {
    lines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    lines = [];
  }
  const parsed = Input.safeParse({ email: formData.get("email"), lines });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check your details." };

  // TODO(backend): run the on-demand supplier stock check (runStockPriceSync with
  // onlyVariantIds) here, so a SKU that sold out since the last 6-hour sync is caught.
  const problems: Array<{ sku: string; reason: string }> = [];
  const items = [];
  for (const l of parsed.data.lines) {
    const hit = priceShopVariant(l.sku);
    if (!hit) problems.push({ sku: l.sku, reason: "no longer sold" });
    else if (!hit.available) problems.push({ sku: l.sku, reason: "sold out" });
    else items.push({ name: hit.product.name, sku: l.sku, unit: hit.priceCents, qty: l.qty });
  }
  if (problems.length) return { status: "error", message: "Some items changed since you added them. Remove them to continue.", problems };

  const subtotal = items.reduce((s, i) => s + i.unit * i.qty, 0);
  const shipping = subtotal >= site.freeShippingCents ? 0 : site.flatShippingCents;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return { status: "error", message: "Payments aren't switched on in this preview, so no order was placed. Your cart is saved." };
  }

  const body = new URLSearchParams({
    mode: "payment",
    customer_email: parsed.data.email,
    success_url: `${site.url}/shop/track?placed=1&session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site.url}/shop/cart`,
    "shipping_address_collection[allowed_countries][0]": "US",
    "phone_number_collection[enabled]": "true",
    "automatic_tax[enabled]": process.env.STRIPE_TAX === "on" ? "true" : "false",
    "shipping_options[0][shipping_rate_data][type]": "fixed_amount",
    "shipping_options[0][shipping_rate_data][display_name]": shipping ? "Standard" : "Free standard shipping",
    "shipping_options[0][shipping_rate_data][fixed_amount][amount]": String(shipping),
    "shipping_options[0][shipping_rate_data][fixed_amount][currency]": "usd",
  });
  items.forEach((it, i) => {
    body.set(`line_items[${i}][quantity]`, String(it.qty));
    body.set(`line_items[${i}][price_data][currency]`, "usd");
    body.set(`line_items[${i}][price_data][unit_amount]`, String(it.unit));
    body.set(`line_items[${i}][price_data][product_data][name]`, it.name);
    body.set(`line_items[${i}][price_data][product_data][metadata][sku]`, it.sku);
  });

  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded", "idempotency-key": crypto.randomUUID() },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json()) as { url?: string; error?: { message?: string } };
    if (!res.ok || !json.url?.startsWith("https://checkout.stripe.com/")) {
      console.error("[checkout] stripe error", res.status, json.error?.message);
      return { status: "error", message: "We couldn't start checkout. Nothing was charged. Please try again." };
    }
    return { status: "redirect", url: json.url };
  } catch {
    return { status: "error", message: "We couldn't reach the payment service. Nothing was charged. Please try again." };
  }
}
