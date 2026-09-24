import { SupplierError } from "../errors";

type Clock = () => number;

/**
 * Token bucket. AliExpress enforces per-app QPS limits; staying under them
 * ourselves avoids throttling errors that would stall a sync run.
 */
export class RateLimiter {
  private tokens: number;
  private last: number;
  constructor(
    private readonly perSecond: number,
    private readonly burst = perSecond,
    private readonly now: Clock = Date.now,
    private readonly sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  ) {
    this.tokens = burst;
    this.last = now();
  }
  async take(): Promise<void> {
    for (;;) {
      const t = this.now();
      this.tokens = Math.min(this.burst, this.tokens + ((t - this.last) / 1000) * this.perSecond);
      this.last = t;
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      await this.sleep(Math.ceil(((1 - this.tokens) / this.perSecond) * 1000));
    }
  }
}

/**
 * Stops hammering a supplier that is down. After `threshold` consecutive
 * failures, calls fail fast for `coolDownMs`, then one trial call is let
 * through (half-open).
 */
export class CircuitBreaker {
  private failures = 0;
  private openedAt: number | null = null;
  constructor(
    private readonly threshold = 5,
    private readonly coolDownMs = 60_000,
    private readonly now: Clock = Date.now,
  ) {}

  get state(): "closed" | "open" | "half_open" {
    if (this.openedAt === null) return "closed";
    return this.now() - this.openedAt >= this.coolDownMs ? "half_open" : "open";
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") throw new SupplierError("blocked", "Supplier circuit open; skipping call");
    try {
      const out = await fn();
      this.failures = 0;
      this.openedAt = null;
      return out;
    } catch (err) {
      // Only infrastructure-type failures trip the breaker; a rejected SKU is not an outage.
      if (err instanceof SupplierError && (err.kind === "transient" || err.kind === "rate_limited")) {
        this.failures += 1;
        if (this.failures >= this.threshold || this.state === "half_open") this.openedAt = this.now();
      }
      throw err;
    }
  }
}

/** Exponential backoff with full jitter. attempt is 1-based. */
export function backoffMs(attempt: number, baseMs = 1000, capMs = 5 * 60_000, rand: () => number = Math.random) {
  const exp = Math.min(capMs, baseMs * 2 ** (attempt - 1));
  return Math.floor(rand() * exp);
}

/** Retries only errors marked retryable (reads). Never use for order placement. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { attempts = 3, baseMs = 500, sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)) } = {},
): Promise<T> {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!(err instanceof SupplierError) || !err.retryable || i === attempts) throw err;
      await sleep(err.details.retryAfterMs ?? backoffMs(i, baseMs));
    }
  }
  throw lastErr;
}
