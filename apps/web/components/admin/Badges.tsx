import type { OrderStatus, QuoteStatus } from "@/lib/server/data";

const QUOTE: Record<QuoteStatus, [string, string]> = {
  new: ["New", "badge--new"], reviewing: ["Reviewing", "badge--warn"], sent: ["Sent", "badge--muted"],
  accepted: ["Accepted", "badge--ok"], declined: ["Declined", "badge--muted"], expired: ["Expired", "badge--muted"],
};
const ORDER: Record<OrderStatus, [string, string]> = {
  paid: ["Paid · to ship", "badge--warn"], processing: ["Processing", "badge--new"], shipped: ["Shipped", "badge--ok"],
  delivered: ["Delivered", "badge--ok"], cancelled: ["Cancelled", "badge--muted"], refunded: ["Refunded", "badge--danger"],
};
export const QuoteBadge = ({ s }: { s: QuoteStatus }) => <span className={`badge ${QUOTE[s][1]}`}>{QUOTE[s][0]}</span>;
export const OrderBadge = ({ s }: { s: OrderStatus }) => <span className={`badge ${ORDER[s][1]}`}>{ORDER[s][0]}</span>;
export const AUDIENCE: Record<string, string> = { parks: "Parks & properties", dog: "Dog owner", both: "Both" };
export const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
