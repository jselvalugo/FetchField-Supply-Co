"use server";

import { z } from "zod";
import { rateLimit } from "@/lib/server/rate-limit";

export type TrackState =
  | { status: "idle" }
  | { status: "not_found" }
  | {
      status: "found";
      order: string;
      headline: string;
      eta: { from: string; to: string } | null;
      events: Array<{ label: string; done: boolean; at?: string; where?: string }>;
    };

const Input = z.object({ order: z.string().trim().toUpperCase().regex(/^FF-\d{4,10}$/), zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/) });

/**
 * Branded tracking (spec §7, §8.5). The carrier and tracking number shown to
 * the customer come from the supplier order, but the supplier's name, order
 * ID and store never appear here.
 *
 * TODO(backend): look up the order in Medusa and map SupplierOrderStatus to
 * these events. No orders exist yet, so every lookup is "not found".
 */
export async function lookupOrder(_prev: TrackState, formData: FormData): Promise<TrackState> {
  if (!(await rateLimit("track", 30, 10 * 60_000))) return { status: "not_found" };
  const parsed = Input.safeParse({ order: formData.get("order"), zip: formData.get("zip") });
  if (!parsed.success) return { status: "not_found" };
  return { status: "not_found" };
}
