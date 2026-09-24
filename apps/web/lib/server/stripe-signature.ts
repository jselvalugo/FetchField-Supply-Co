import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies a Stripe webhook signature header ("t=...,v1=...") against the
 * raw request body. Rejects anything older than `toleranceSec` to stop replays.
 */
export function verifyStripeSignature(raw: string, header: string | null, secret: string, nowSec = Math.floor(Date.now() / 1000), toleranceSec = 300): boolean {
  if (!header || !secret) return false;
  const parts = header.split(",").map((p) => p.split("=") as [string, string]);
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!Number.isInteger(t) || !sigs.length || Math.abs(nowSec - t) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${raw}`, "utf8").digest();
  return sigs.some((s) => {
    const got = Buffer.from(s, "hex");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}
