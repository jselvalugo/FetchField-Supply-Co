"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { baseCatalog } from "@/lib/catalog";
import {
  audit,
  deleteSignup,
  getOrder,
  getOverrides,
  getQuote,
  saveOrder,
  saveQuote,
  setOverrides,
  type OrderStatus,
  type QuoteStatus,
} from "@/lib/server/data";
import { requireAdmin } from "@/lib/server/require-admin";

/*
 * Admin mutations. Each one re-checks the session (requireAdmin), validates
 * input with zod, writes an audit entry, and revalidates the pages it affects.
 */

const cents = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim().replace(/[$,]/g, "");
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
};

export async function removeSignup(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await deleteSignup(id);
  await audit("signup_deleted", id);
  revalidatePath("/admin", "layout");
}

const QuoteUpdate = z.object({
  ref: z.string(),
  status: z.enum(["new", "reviewing", "sent", "accepted", "declined", "expired"]),
  internalNote: z.string().max(4000),
});
export async function updateQuote(formData: FormData) {
  await requireAdmin();
  const u = QuoteUpdate.parse(Object.fromEntries(formData));
  const q = await getQuote(u.ref);
  if (!q) redirect("/admin/quotes");
  const at = new Date().toISOString();
  const history = q.status !== u.status ? [...q.history, { at, event: `Status → ${u.status}` }] : q.history;
  await saveQuote({ ...q, status: u.status as QuoteStatus, internalNote: u.internalNote, history });
  await audit("quote_updated", `${q.ref} ${u.status}`);
  revalidatePath("/admin", "layout");
  redirect(`/admin/quotes/${q.ref}?saved=1`);
}

const OrderUpdate = z.object({
  id: z.string(),
  status: z.enum(["paid", "processing", "shipped", "delivered", "cancelled", "refunded"]),
  carrier: z.string().trim().max(40),
  number: z.string().trim().max(60).regex(/^[A-Za-z0-9 -]*$/, "Tracking numbers are letters and digits"),
  internalNote: z.string().max(4000),
});
export async function updateOrder(formData: FormData) {
  await requireAdmin();
  const u = OrderUpdate.parse(Object.fromEntries(formData));
  const o = await getOrder(u.id);
  if (!o) redirect("/admin/orders");
  const at = new Date().toISOString();
  const label: Record<OrderStatus, string> = { paid: "Paid", processing: "Processing", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled", refunded: "Refunded" };
  const history = o.status !== u.status ? [...o.history, { at, event: label[u.status] }] : o.history;
  // TODO(email): send the "Shipped" email with the tracking link when status moves to shipped.
  await saveOrder({ ...o, status: u.status, internalNote: u.internalNote, tracking: u.carrier && u.number ? { carrier: u.carrier, number: u.number } : null, history });
  await audit("order_updated", `${o.id} ${u.status}`);
  revalidatePath("/admin", "layout");
  redirect(`/admin/orders/${o.id}?saved=1`);
}

export async function saveShopProduct(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const base = baseCatalog().shop.find((p) => p.slug === slug);
  if (!base) redirect("/admin/products");
  const price = cents(formData.get("price"));
  const compareRaw = String(formData.get("compareAt") ?? "").trim();
  const compare = compareRaw === "" ? null : cents(compareRaw);
  const tMin = Number(formData.get("transitMin"));
  const tMax = Number(formData.get("transitMax"));
  const errors: string[] = [];
  if (price === null || price < 100) errors.push("price");
  // A "was" price must parse and be higher than the price, or it's a fake discount.
  if (compareRaw !== "" && (compare === null || (price !== null && compare <= price))) errors.push("compareAt");
  if (!Number.isInteger(tMin) || !Number.isInteger(tMax) || tMin < 0 || tMax < tMin || tMax > 60) errors.push("transit");
  if (errors.length) redirect(`/admin/products/shop/${slug}?error=${errors.join(",")}`);

  const skus = new Set(base.variants.map((v) => v.sku));
  const soldOut = formData.getAll("soldOut").map(String).filter((s) => skus.has(s));
  const o = await getOverrides();
  o.shop[slug] = {
    hidden: formData.get("visible") !== "on",
    summary: String(formData.get("summary") ?? "").trim().slice(0, 240) || undefined,
    priceCents: price!,
    compareAtCents: compare,
    soldOut,
    transit: { minDays: tMin, maxDays: tMax },
  };
  await setOverrides(o);
  await audit("product_saved", `shop/${slug} $${(price! / 100).toFixed(2)}${o.shop[slug]!.hidden ? " hidden" : ""}`);
  revalidatePath("/", "layout");
  redirect(`/admin/products/shop/${slug}?saved=1`);
}

export async function saveProProduct(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const base = baseCatalog().pro.find((p) => p.slug === slug);
  if (!base) redirect("/admin/products");
  const o = await getOverrides();
  const entry: NonNullable<typeof o.pro[string]> = {
    hidden: formData.get("visible") !== "on",
    summary: String(formData.get("summary") ?? "").trim().slice(0, 240) || undefined,
    leadTime: String(formData.get("leadTime") ?? "").trim().slice(0, 60) || undefined,
  };
  if (base.pricing.kind === "tiers") {
    const tiers: Array<{ minQty: number; priceCents: number }> = [];
    for (let i = 0; i < 4; i++) {
      const min = String(formData.get(`tier${i}min`) ?? "").trim();
      if (!min) continue;
      const minQty = Number(min);
      const price = cents(formData.get(`tier${i}price`));
      if (!Number.isInteger(minQty) || minQty < 1 || price === null || price < 1) redirect(`/admin/products/pro/${slug}?error=tiers`);
      tiers.push({ minQty, priceCents: price! });
    }
    tiers.sort((a, b) => a.minQty - b.minQty);
    // Each tier must be cheaper than the one before; max qty is the next tier's min - 1.
    if (!tiers.length || tiers.some((t, i) => i > 0 && (t.minQty === tiers[i - 1]!.minQty || t.priceCents > tiers[i - 1]!.priceCents))) {
      redirect(`/admin/products/pro/${slug}?error=tiers`);
    }
    entry.tiers = tiers.map((t, i) => ({ minQty: t.minQty, maxQty: tiers[i + 1] ? tiers[i + 1]!.minQty - 1 : null, priceCents: t.priceCents }));
  } else {
    entry.customReason = String(formData.get("customReason") ?? "").trim().slice(0, 600) || undefined;
  }
  o.pro[slug] = entry;
  await setOverrides(o);
  await audit("product_saved", `pro/${slug}${entry.hidden ? " hidden" : ""}`);
  revalidatePath("/", "layout");
  redirect(`/admin/products/pro/${slug}?saved=1`);
}

export async function resetProduct(formData: FormData) {
  await requireAdmin();
  const store = String(formData.get("storefront"));
  const slug = String(formData.get("slug") ?? "");
  if (store !== "pro" && store !== "shop") redirect("/admin/products");
  const o = await getOverrides();
  delete o[store][slug];
  await setOverrides(o);
  await audit("product_reset", `${store}/${slug}`);
  revalidatePath("/", "layout");
  redirect(`/admin/products/${store}/${slug}?saved=1`);
}
