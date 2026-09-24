import {
  checkShipDeadline,
  checkStaleness,
  forwardSupplierOrder,
  runStockPriceSync,
  statusTransitionEmail,
  type AlertSink,
  type PricingRule,
  type SupplierAdapter,
} from "@fetchfield/suppliers";
import type { Db } from "./db/pool";
import { PgForwardingRepo, PgSyncRepo } from "./db/repos";

export interface JobDeps {
  db: Db;
  adapters: Map<string, SupplierAdapter>;
  alerts: AlertSink;
  rule: PricingRule;
  shipTo: string;
  /** Sends customer emails (shipped/delivered/delay notice). Wired to Resend/Postmark in production. */
  notify: (orderId: string, kind: "shipped" | "delivered" | "delay_notice") => Promise<void>;
}

/** Every 6h, and on demand for cart variants before checkout (spec §8.4). */
export async function stockPriceSyncJob(deps: JobDeps, onlyVariantIds?: string[]) {
  const run = await deps.db.query<{ id: string }>(`INSERT INTO sync_runs (kind) VALUES ('stock_price') RETURNING id`);
  const summary = await runStockPriceSync(
    { adapters: deps.adapters, repo: new PgSyncRepo(deps.db), rule: deps.rule, alerts: deps.alerts, shipTo: deps.shipTo },
    onlyVariantIds,
  );
  await deps.db.query(`UPDATE sync_runs SET finished_at = now(), summary = $2 WHERE id = $1`, [run.rows[0]!.id, JSON.stringify(summary)]);
  return summary;
}

/** Hourly: alert if any published variant's supplier data is over 24h old. */
export function stalenessJob(deps: JobDeps) {
  return checkStaleness(new PgSyncRepo(deps.db), deps.alerts);
}

/** One job per supplier order, enqueued when an order is paid (spec §8.5). */
export function forwardOrderJob(deps: JobDeps, supplierOrderId: string) {
  return forwardSupplierOrder(supplierOrderId, { repo: new PgForwardingRepo(deps.db), adapters: deps.adapters, alerts: deps.alerts });
}

/** Every 4h: poll status and tracking, email the customer on transitions. */
export async function trackingPollJob(deps: JobDeps) {
  const repo = new PgForwardingRepo(deps.db);
  let emailed = 0;
  for (const row of await repo.listPlacedForPolling()) {
    const adapter = deps.adapters.get(row.adapterId);
    if (!adapter) continue;
    try {
      const status = await adapter.getOrderStatus(row.ref);
      const email = statusTransitionEmail(row.last, status);
      await repo.saveStatus(row.id, status);
      if (email) {
        await deps.notify(row.orderId, email);
        emailed++;
      }
    } catch (err) {
      await deps.alerts.alert({ level: "warn", code: "sync_failed", message: `Tracking poll failed: ${err instanceof Error ? err.message : String(err)}`, ref: row.orderId });
    }
  }
  return { emailed };
}

/**
 * Daily: FTC Mail Order Rule check for unshipped paid orders (spec §8.6).
 * Reads promised ship-by dates from the orders table maintained by the backend.
 */
export async function shipDeadlineJob(
  deps: JobDeps,
  orders: Array<{ orderId: string; paidAt: Date; statedShipBy: Date | null; shippedAt: Date | null; noticeRevisedShipBy: Date | null; cancelled: boolean }>,
  now = new Date(),
) {
  const due = [];
  for (const o of orders) {
    const action = checkShipDeadline(o, now);
    if (action.kind === "send_delay_notice") {
      due.push(o.orderId);
      await deps.notify(o.orderId, "delay_notice");
      await deps.alerts.alert({ level: "warn", code: "order_delay_notice", message: `Delay notice sent (${action.reason}); customer offered cancellation.`, ref: o.orderId });
    }
  }
  return due;
}
