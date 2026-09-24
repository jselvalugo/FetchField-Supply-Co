export const usd = (cents: number, opts: { cents?: boolean } = {}) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts.cents === false || (opts.cents === undefined && cents % 100 === 0) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);

export const shortDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const longDate = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
