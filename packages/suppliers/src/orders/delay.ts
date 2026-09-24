/**
 * FTC Mail, Internet, or Telephone Order Merchandise Rule (16 CFR 435).
 * We must ship within the time we stated, or within 30 days if we stated no
 * time. If we can't, we must notify the customer before that deadline with
 * a revised date and offer them the choice to cancel for a full refund. If a
 * revised date also slips, we notify again.
 *
 * This decides what the order-delay flow must do; sending is the caller's job.
 */

export interface ShipPromise {
  paidAt: Date;
  /** Latest ship date we showed at checkout (from the delivery estimate), or null if none. */
  statedShipBy: Date | null;
  shippedAt: Date | null;
  /** Most recent revised ship-by date we notified the customer about, if any. */
  noticeRevisedShipBy: Date | null;
  cancelled: boolean;
}

export type DelayAction =
  | { kind: "none" }
  | { kind: "send_delay_notice"; deadline: Date; reason: "first_notice" | "revised_date_slipping" };

const DAY = 24 * 60 * 60 * 1000;

/** The date we're currently obliged to ship by. */
export function shipDeadline(p: ShipPromise): Date {
  if (p.noticeRevisedShipBy) return p.noticeRevisedShipBy;
  return p.statedShipBy ?? new Date(p.paidAt.getTime() + 30 * DAY);
}

/**
 * Run daily for every unshipped order. Warns `leadDays` before the deadline so
 * the notice goes out on time, not after the rule is already broken.
 */
export function checkShipDeadline(p: ShipPromise, now: Date, leadDays = 2): DelayAction {
  if (p.shippedAt || p.cancelled) return { kind: "none" };
  const deadline = shipDeadline(p);
  if (now.getTime() >= deadline.getTime() - leadDays * DAY) {
    return { kind: "send_delay_notice", deadline, reason: p.noticeRevisedShipBy ? "revised_date_slipping" : "first_notice" };
  }
  return { kind: "none" };
}
