/**
 * Retail pricing rule engine (spec §8.3 step 5). Pure: no I/O, integer cents.
 *
 *   price = (cost + shipping + handling + fixedFee) / (1 − feePct − targetMargin)
 *
 * then rounded UP to the next allowed ending (.00 / .50 / .95), which only
 * ever raises margin. The same margin math is used by the sync job to check a
 * published price after a supplier cost change.
 */

export type Ending = 0 | 50 | 95;

export interface PricingRule {
  /** Margin we aim for, 0–1, as a share of the retail price. */
  targetMargin: number;
  /** Below this margin a product is flagged at publish and hidden by the sync job. */
  marginFloor: number;
  /** Card processing, e.g. Stripe 2.9% + 30¢. */
  paymentFeePct: number;
  paymentFeeFixedCents: number;
  /** Our own packaging/handling/returns reserve per unit. */
  handlingCents: number;
  endings: readonly Ending[];
}

/** Placeholder until the margin floor is decided (spec §15 open question). */
export const DEFAULT_RULE: PricingRule = {
  targetMargin: 0.45,
  marginFloor: 0.3,
  paymentFeePct: 0.029,
  paymentFeeFixedCents: 30,
  handlingCents: 150,
  endings: [0, 50, 95],
};

export interface CostInput {
  costCents: number;
  shippingCents: number;
}

export interface PriceResult {
  priceCents: number;
  margin: number;
  belowFloor: boolean;
  breakdown: {
    costCents: number;
    shippingCents: number;
    handlingCents: number;
    paymentFeeCents: number;
    profitCents: number;
  };
}

export function validateRule(rule: PricingRule): void {
  const { targetMargin, marginFloor, paymentFeePct } = rule;
  if (!(targetMargin > 0 && targetMargin < 1)) throw new Error("targetMargin must be between 0 and 1");
  if (!(marginFloor >= 0 && marginFloor <= targetMargin)) throw new Error("marginFloor must be between 0 and targetMargin");
  if (!(paymentFeePct >= 0 && paymentFeePct + targetMargin < 1)) throw new Error("paymentFeePct + targetMargin must be < 1");
  if (rule.endings.length === 0) throw new Error("at least one price ending is required");
  if (!Number.isInteger(rule.handlingCents) || !Number.isInteger(rule.paymentFeeFixedCents)) {
    throw new Error("fixed amounts must be integer cents");
  }
}

/** Smallest price ≥ raw that ends in one of the allowed endings. */
export function roundUpToEnding(rawCents: number, endings: readonly Ending[]): number {
  const sorted = [...endings].sort((a, b) => a - b);
  const dollars = Math.floor(rawCents / 100);
  for (const d of [dollars, dollars + 1]) {
    for (const e of sorted) {
      const candidate = d * 100 + e;
      if (candidate >= rawCents) return candidate;
    }
  }
  /* c8 ignore next */
  throw new Error("unreachable");
}

/** Margin of a given retail price, after cost, shipping, handling and card fees. */
export function marginAt(priceCents: number, input: CostInput, rule: PricingRule): PriceResult {
  if (!Number.isInteger(priceCents) || priceCents <= 0) throw new Error("price must be positive integer cents");
  const fee = Math.round(priceCents * rule.paymentFeePct) + rule.paymentFeeFixedCents;
  const profit = priceCents - input.costCents - input.shippingCents - rule.handlingCents - fee;
  const margin = profit / priceCents;
  return {
    priceCents,
    margin,
    belowFloor: margin < rule.marginFloor,
    breakdown: {
      costCents: input.costCents,
      shippingCents: input.shippingCents,
      handlingCents: rule.handlingCents,
      paymentFeeCents: fee,
      profitCents: profit,
    },
  };
}

/** Suggested retail price for a new listing. The curator can override; the floor check still applies. */
export function suggestPrice(input: CostInput, rule: PricingRule = DEFAULT_RULE): PriceResult {
  validateRule(rule);
  for (const v of [input.costCents, input.shippingCents]) {
    if (!Number.isInteger(v) || v < 0) throw new Error("cost inputs must be non-negative integer cents");
  }
  const raw = Math.ceil(
    (input.costCents + input.shippingCents + rule.handlingCents + rule.paymentFeeFixedCents) /
      (1 - rule.paymentFeePct - rule.targetMargin),
  );
  return marginAt(roundUpToEnding(raw, rule.endings), input, rule);
}
