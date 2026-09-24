"use server";

import { z } from "zod";
import { getOrder, type OrderStatus } from "@/lib/server/data";
import { rateLimit } from "@/lib/server/rate-limit";

export type TrackState =
  | { status: "idle" }
  | { status: "not_found" }
  | {
      status: "found";
      order: string;
      headline: string;
      eta: { from: string; to: string } | null;
      tracking: { carrier: string; number: string } | null;
      events: Array<{ label: string; done: boolean; at?: string; where?: string }>;
    };

const Input = z.object({ order: z.string().trim().toUpperCase().regex(/^FF-\d{6}$/), zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/) });

const STEPS: Array<{ label: string; reached: OrderStatus[] }> = [
  { label: "Order placed", reached: ["paid", "processing", "shipped", "delivered"] },
  { label: "Processing", reached: ["processing", "shipped", "delivered"] },
  { label: "Shipped", reached: ["shipped", "delivered"] },
  { label: "Delivered", reached: ["delivered"] },
];
const HEADLINE: Record<OrderStatus, string> = {
  paid: "We've got your order.",
  processing: "We're getting it ready.",
  shipped: "It's on the way.",
  delivered: "Delivered.",
  cancelled: "This order was cancelled.",
  refunded: "This order was refunded.",
};

/**
 * Branded tracking (spec §7, §8.5). Needs the order number AND the shipping ZIP,
 * so an order can't be looked up by guessing numbers. Supplier names and IDs are never shown.
 */
export async function lookupOrder(_prev: TrackState, formData: FormData): Promise<TrackState> {
  if (!(await rateLimit("track", 30, 10 * 60_000))) return { status: "not_found" };
  const parsed = Input.safeParse({ order: formData.get("order"), zip: formData.get("zip") });
  if (!parsed.success) return { status: "not_found" };
  const o = await getOrder(parsed.data.order);
  if (!o || !o.shipTo || o.shipTo.zip.slice(0, 5) !== parsed.data.zip.slice(0, 5)) return { status: "not_found" };
  const at = (label: string) => o.history.find((h) => h.event.toLowerCase().startsWith(label.toLowerCase()))?.at;
  return {
    status: "found",
    order: o.id,
    headline: HEADLINE[o.status],
    eta: null,
    tracking: o.tracking,
    events: STEPS.map((s) => ({ label: s.label, done: s.reached.includes(o.status), at: s.label === "Order placed" ? o.createdAt : at(s.label) })),
  };
}
