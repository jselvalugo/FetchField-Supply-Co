export type SupplierErrorKind =
  /** Bad/expired credentials. Needs a human to re-authorize. */
  | "auth"
  /** Supplier throttled us. Retry after backoff. */
  | "rate_limited"
  /** Network blip, 5xx, timeout on a read. Safe to retry. */
  | "transient"
  /** Supplier answered with a shape we don't recognise. Do not trust the data. */
  | "invalid_response"
  /** Supplier refused the request (bad SKU, out of stock, address rejected). Retrying won't help. */
  | "rejected"
  /** A write (order placement) may or may not have happened. Never blind-retry; reconcile first. */
  | "unknown_outcome"
  /** Our own guard refused the call (host not allowlisted, circuit open, config missing). */
  | "blocked";

export class SupplierError extends Error {
  override readonly name = "SupplierError";
  constructor(
    readonly kind: SupplierErrorKind,
    message: string,
    readonly details: { adapterId?: string; code?: string; retryAfterMs?: number } = {},
  ) {
    super(message);
  }
  get retryable(): boolean {
    return this.kind === "transient" || this.kind === "rate_limited";
  }
}

export const isSupplierError = (e: unknown): e is SupplierError => e instanceof SupplierError;
