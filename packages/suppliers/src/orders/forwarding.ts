import type { AlertSink } from "../alerts";
import { SupplierError } from "../errors";
import { backoffMs } from "../http/guards";
import type { Address, SupplierAdapter, SupplierOrderRef, SupplierOrderRequest, SupplierOrderStatus } from "../types";

export type ForwardState = "pending" | "placing" | "retry" | "placed" | "needs_attention";

export interface SupplierOrderRow {
  id: string;
  orderId: string;
  adapterId: string;
  state: ForwardState;
  attempts: number;
  request: SupplierOrderRequest;
  ref: SupplierOrderRef | null;
  lastError: string | null;
}

export interface ForwardingRepo {
  get(id: string): Promise<SupplierOrderRow | null>;
  /**
   * Atomically moves pending|retry → placing and increments attempts.
   * Returns false if another worker got there first. Must be a
   * compare-and-set in the database (UPDATE … WHERE state IN (…)).
   */
  claim(id: string): Promise<boolean>;
  markPlaced(id: string, ref: SupplierOrderRef): Promise<void>;
  markRetry(id: string, error: string): Promise<void>;
  markNeedsAttention(id: string, error: string): Promise<void>;
}

export type ForwardOutcome =
  | { kind: "placed"; ref: SupplierOrderRef }
  | { kind: "retry"; delayMs: number }
  | { kind: "needs_attention"; reason: string }
  | { kind: "skipped"; reason: string };

export const MAX_ATTEMPTS = 3;

/**
 * Places one supplier order for a paid customer order (spec §8.5).
 * - Idempotent: a placed row is never placed again, and the claim step stops two workers racing
 * - Transient failures back off and retry. After 3 attempts the order goes to "Needs attention"
 * - Unknown outcomes (a timeout after sending) are never retried. A duplicate order costs real money
 * - A row found stuck in "placing" (worker crashed mid-call) is treated as an unknown outcome
 */
export async function forwardSupplierOrder(
  id: string,
  deps: { repo: ForwardingRepo; adapters: Map<string, SupplierAdapter>; alerts: AlertSink; rand?: () => number },
): Promise<ForwardOutcome> {
  const row = await deps.repo.get(id);
  if (!row) return { kind: "skipped", reason: "not found" };
  if (row.state === "placed") return { kind: "skipped", reason: "already placed" };
  if (row.state === "needs_attention") return { kind: "skipped", reason: "parked for a person" };
  if (row.state === "placing") {
    const reason = "Found mid-placement after a restart. Check the supplier for this order before retrying.";
    await deps.repo.markNeedsAttention(id, reason);
    await deps.alerts.alert({ level: "critical", code: "order_needs_attention", message: reason, ref: row.orderId });
    return { kind: "needs_attention", reason };
  }
  const adapter = deps.adapters.get(row.adapterId);
  if (!adapter) {
    const reason = `No adapter registered for ${row.adapterId}`;
    await deps.repo.markNeedsAttention(id, reason);
    await deps.alerts.alert({ level: "critical", code: "order_needs_attention", message: reason, ref: row.orderId });
    return { kind: "needs_attention", reason };
  }
  if (!(await deps.repo.claim(id))) return { kind: "skipped", reason: "claimed by another worker" };
  const attempt = row.attempts + 1;

  try {
    const ref = await adapter.placeOrder(row.request);
    await deps.repo.markPlaced(id, ref);
    return { kind: "placed", ref };
  } catch (err) {
    const e = err instanceof SupplierError ? err : new SupplierError("unknown_outcome", err instanceof Error ? err.message : String(err));
    const retryable = e.retryable || e.kind === "blocked" || e.kind === "auth";
    if (retryable && attempt < MAX_ATTEMPTS) {
      await deps.repo.markRetry(id, e.message);
      return { kind: "retry", delayMs: Math.max(30_000, backoffMs(attempt, 60_000, 30 * 60_000, deps.rand)) };
    }
    const reason =
      e.kind === "unknown_outcome"
        ? `Outcome unknown. Search the supplier's orders for memo "FF ${row.request.idempotencyKey}" before retrying. (${e.message})`
        : e.kind === "rejected"
          ? `Supplier rejected the order: ${e.message}`
          : `Failed after ${attempt} attempts: ${e.message}`;
    await deps.repo.markNeedsAttention(id, reason);
    await deps.alerts.alert({ level: "critical", code: "order_needs_attention", message: reason, ref: row.orderId });
    return { kind: "needs_attention", reason };
  }
}

export interface PaidLine {
  variantId: string;
  quantity: number;
  /** The active supplier link chosen by the last sync. */
  link: { adapterId: string; externalId: string; externalSkuId: string; shippingServiceCode: string };
}

/** Splits a paid order into one supplier request per adapter (spec §8.5). */
export function splitBySupplier(orderId: string, lines: PaidLine[], shipTo: Address): Array<{ adapterId: string; request: SupplierOrderRequest }> {
  const groups = new Map<string, PaidLine[]>();
  for (const l of lines) {
    if (!groups.has(l.link.adapterId)) groups.set(l.link.adapterId, []);
    groups.get(l.link.adapterId)!.push(l);
  }
  return [...groups].map(([adapterId, ls]) => ({
    adapterId,
    request: {
      idempotencyKey: `${orderId}-${adapterId}`,
      shipTo,
      memo: orderId,
      lines: ls.map((l) => ({
        externalId: l.link.externalId,
        externalSkuId: l.link.externalSkuId,
        quantity: l.quantity,
        shippingServiceCode: l.link.shippingServiceCode,
      })),
    },
  }));
}

/** Compares two polled statuses and says which customer email, if any, to send. */
export function statusTransitionEmail(prev: SupplierOrderStatus | null, next: SupplierOrderStatus): "shipped" | "delivered" | null {
  const was = prev?.state;
  if (next.state === "shipped" && was !== "shipped" && was !== "delivered" && next.tracking.length > 0) return "shipped";
  if (next.state === "delivered" && was !== "delivered") return "delivered";
  return null;
}
