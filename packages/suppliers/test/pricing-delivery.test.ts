import { describe, expect, it } from "vitest";
import { DEFAULT_RULE, marginAt, roundUpToEnding, suggestPrice, validateRule } from "../src/pricing/rules";
import { estimateDelivery, isValidZip, remoteDays } from "../src/delivery/estimate";
import { checkShipDeadline } from "../src/orders/delay";

describe("pricing rules", () => {
  it("rounds up to .00/.50/.95 endings", () => {
    expect(roundUpToEnding(1201, [0, 50, 95])).toBe(1250);
    expect(roundUpToEnding(1250, [0, 50, 95])).toBe(1250);
    expect(roundUpToEnding(1296, [0, 50, 95])).toBe(1300);
    expect(roundUpToEnding(1260, [95])).toBe(1295);
    expect(roundUpToEnding(1296, [95])).toBe(1395);
  });

  it("suggests a price that meets the target margin after fees", () => {
    const r = suggestPrice({ costCents: 642, shippingCents: 0 });
    // (642 + 0 + 150 + 30) / (1 - 0.029 - 0.45) = 1577.7 → 1595
    expect(r.priceCents).toBe(1595);
    expect(r.margin).toBeGreaterThanOrEqual(DEFAULT_RULE.targetMargin);
    expect(r.belowFloor).toBe(false);
    const b = r.breakdown;
    expect(b.costCents + b.shippingCents + b.handlingCents + b.paymentFeeCents + b.profitCents).toBe(r.priceCents);
  });

  it("flags a published price that drops under the floor after a cost rise", () => {
    const published = suggestPrice({ costCents: 642, shippingCents: 0 }).priceCents;
    expect(marginAt(published, { costCents: 900, shippingCents: 0 }, DEFAULT_RULE).belowFloor).toBe(true);
    expect(marginAt(published, { costCents: 700, shippingCents: 0 }, DEFAULT_RULE).belowFloor).toBe(false);
  });

  it("rejects impossible rules and float money", () => {
    expect(() => validateRule({ ...DEFAULT_RULE, targetMargin: 0.98 })).toThrow();
    expect(() => validateRule({ ...DEFAULT_RULE, marginFloor: 0.6 })).toThrow();
    expect(() => suggestPrice({ costCents: 6.42, shippingCents: 0 })).toThrow();
  });
});

describe("delivery estimate", () => {
  // Thursday 10:00 local
  const thu = new Date(2026, 8, 24, 10, 0);
  it("returns a range: handling in business days, then transit", () => {
    const r = estimateDelivery({ transitMinDays: 8, transitMaxDays: 12, orderedAt: thu, zip: "97205" });
    // handling 1–2 business days → Fri 25 / Mon 28; +8 → Oct 3, +12 → Oct 10
    expect(r.earliest.toDateString()).toBe(new Date(2026, 9, 3).toDateString());
    expect(r.latest.toDateString()).toBe(new Date(2026, 9, 10).toDateString());
  });
  it("counts from the next business day after cutoff or on weekends", () => {
    const late = estimateDelivery({ transitMinDays: 0, transitMaxDays: 0, orderedAt: new Date(2026, 8, 25, 16), zip: "10001" });
    expect(late.earliest.toDateString()).toBe(new Date(2026, 8, 29).toDateString()); // Fri late → Mon start → Tue
    const sat = estimateDelivery({ transitMinDays: 0, transitMaxDays: 0, orderedAt: new Date(2026, 8, 26, 9), zip: "10001" });
    expect(sat.earliest.toDateString()).toBe(new Date(2026, 8, 29).toDateString());
  });
  it("adds days for remote ZIPs and validates input", () => {
    expect(remoteDays("99501")).toBe(5);
    expect(remoteDays("96813")).toBe(5);
    expect(remoteDays("00901")).toBe(6);
    expect(remoteDays("97205")).toBe(0);
    expect(isValidZip("9720")).toBe(false);
    expect(() => estimateDelivery({ transitMinDays: 1, transitMaxDays: 2, orderedAt: thu, zip: "abc" })).toThrow();
  });
});

describe("FTC ship deadline", () => {
  const paidAt = new Date("2026-09-01T12:00:00Z");
  const base = { paidAt, statedShipBy: null, shippedAt: null, noticeRevisedShipBy: null, cancelled: false };
  it("uses 30 days when no ship time was stated and warns ahead of it", () => {
    expect(checkShipDeadline(base, new Date("2026-09-20T00:00:00Z")).kind).toBe("none");
    expect(checkShipDeadline(base, new Date("2026-09-29T12:00:00Z"))).toMatchObject({ kind: "send_delay_notice", reason: "first_notice" });
  });
  it("tracks the stated date, then the revised date", () => {
    const stated = { ...base, statedShipBy: new Date("2026-09-05T00:00:00Z") };
    expect(checkShipDeadline(stated, new Date("2026-09-04T00:00:00Z")).kind).toBe("send_delay_notice");
    const revised = { ...stated, noticeRevisedShipBy: new Date("2026-09-20T00:00:00Z") };
    expect(checkShipDeadline(revised, new Date("2026-09-10T00:00:00Z")).kind).toBe("none");
    expect(checkShipDeadline(revised, new Date("2026-09-19T00:00:00Z"))).toMatchObject({ reason: "revised_date_slipping" });
  });
  it("does nothing once shipped or cancelled", () => {
    expect(checkShipDeadline({ ...base, shippedAt: new Date() }, new Date("2027-01-01")).kind).toBe("none");
  });
});
