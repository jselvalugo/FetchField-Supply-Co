import type { Cents } from "./types";

/**
 * Parses a decimal money string ("12.3", "12.30", "1,299.00") to integer cents
 * without float arithmetic. Returns null for anything that isn't a plain
 * non-negative amount.
 */
export function toCents(input: string | number | null | undefined): Cents | null {
  if (input === null || input === undefined) return null;
  const s = String(input).trim().replace(/,/g, "");
  const m = /^(\d{1,9})(?:\.(\d{1,4}))?$/.exec(s);
  if (!m) return null;
  const whole = Number(m[1]);
  const frac = (m[2] ?? "").padEnd(4, "0");
  // Round half up on the third decimal place.
  const cents = Number(frac.slice(0, 2)) + (Number(frac.slice(2)) >= 50 ? 1 : 0);
  return whole * 100 + cents;
}

export const formatUsd = (cents: Cents): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
