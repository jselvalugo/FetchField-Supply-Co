/**
 * Delivery-date ranges for the Shop (spec §7, §8.6). Honest by construction:
 * supplier min/max transit + our handling, shown as a range, never a best case.
 * Pure and dependency-free so the storefront can use it client-side.
 */

export interface DeliveryInput {
  /** Supplier's quoted transit to the US, calendar days. */
  transitMinDays: number;
  transitMaxDays: number;
  /** Our handling before the supplier ships, business days. */
  handlingMinDays?: number;
  handlingMaxDays?: number;
  /** Orders after this local hour count from the next business day. */
  cutoffHour?: number;
  orderedAt: Date;
  zip: string;
}

export interface DeliveryRange {
  earliest: Date;
  latest: Date;
  /** Extra days applied for the destination (e.g. Alaska, Hawaii). */
  remoteSurchargeDays: number;
}

export const isValidZip = (zip: string) => /^\d{5}(-\d{4})?$/.test(zip.trim());

/** AK, HI, territories and military ZIPs take longer from any origin. */
export function remoteDays(zip: string): number {
  const p3 = Number(zip.trim().slice(0, 3));
  if (p3 >= 995 && p3 <= 999) return 5; // Alaska
  if (p3 >= 967 && p3 <= 968) return 5; // Hawaii
  if (p3 >= 6 && p3 <= 9) return 6; // Puerto Rico, USVI
  if (p3 === 969) return 7; // Guam and Pacific territories
  if ((p3 >= 90 && p3 <= 98) || p3 === 340 || (p3 >= 962 && p3 <= 966)) return 7; // APO/FPO/DPO
  return 0;
}

function addBusinessDays(d: Date, n: number): Date {
  const out = new Date(d);
  let left = n;
  while (left > 0) {
    out.setDate(out.getDate() + 1);
    const day = out.getDay();
    if (day !== 0 && day !== 6) left--;
  }
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function estimateDelivery(input: DeliveryInput): DeliveryRange {
  if (!isValidZip(input.zip)) throw new Error("Enter a 5-digit ZIP code");
  const { transitMinDays, transitMaxDays } = input;
  if (transitMinDays < 0 || transitMaxDays < transitMinDays) throw new Error("Invalid transit window");
  const hMin = input.handlingMinDays ?? 1;
  const hMax = input.handlingMaxDays ?? 2;
  const cutoff = input.cutoffHour ?? 14;

  let start = new Date(input.orderedAt);
  start.setHours(12, 0, 0, 0);
  const weekend = input.orderedAt.getDay() === 0 || input.orderedAt.getDay() === 6;
  if (input.orderedAt.getHours() >= cutoff || weekend) start = addBusinessDays(start, 1);

  const remote = remoteDays(input.zip);
  return {
    earliest: addDays(addBusinessDays(start, hMin), transitMinDays + remote),
    latest: addDays(addBusinessDays(start, hMax), transitMaxDays + remote),
    remoteSurchargeDays: remote,
  };
}
