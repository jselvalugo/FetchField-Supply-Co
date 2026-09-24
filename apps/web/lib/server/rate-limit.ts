import "server-only";
import { headers } from "next/headers";

/**
 * Small fixed-window limiter for form posts. Per server instance only; put a
 * shared limiter (Redis, or the platform's WAF) in front for production.
 */
const hits = new Map<string, { n: number; reset: number }>();

export async function rateLimit(bucket: string, limit: number, windowMs: number): Promise<boolean> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || cur.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    return true;
  }
  cur.n += 1;
  return cur.n <= limit;
}
