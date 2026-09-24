import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { kv, readAll } from "./kv";

// ---------- Launch list ----------
export type Audience = "parks" | "dog" | "both";
export interface Signup {
  id: string;
  email: string;
  audience: Audience;
  createdAt: string;
  source: string;
}

/** Keyed by a hash of the email, so signing up twice doesn't create a duplicate. */
const signupKey = (email: string) => `signups/${createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 24)}`;

export async function addSignup(email: string, audience: Audience, source: string): Promise<"added" | "exists"> {
  const store = await kv();
  const key = signupKey(email);
  if (await store.get<Signup>(key)) return "exists";
  await store.set(key, { id: key.split("/")[1]!, email: email.toLowerCase(), audience, createdAt: new Date().toISOString(), source } satisfies Signup);
  return "added";
}
export async function listSignups(): Promise<Signup[]> {
  return (await readAll<Signup>("signups/")).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function deleteSignup(id: string) {
  if (!/^[0-9a-f]{24}$/.test(id)) throw new Error("bad id");
  await (await kv()).del(`signups/${id}`);
}

// ---------- Quotes ----------
export type QuoteStatus = "new" | "reviewing" | "sent" | "accepted" | "declined" | "expired";
export interface QuoteRecord {
  ref: string;
  createdAt: string;
  expiresAt: string;
  status: QuoteStatus;
  org: { name: string; type: string };
  buyer: { name: string; role: string; email: string; phone: string };
  zip: string;
  neededBy: string;
  install: string;
  taxExempt: string;
  bidNumber: string;
  notes: string;
  lines: Array<{ slug: string; name: string; model: string; qty: number; unit: string; unitCents: number | null; lineCents: number | null; note: string }>;
  subtotalCents: number;
  internalNote: string;
  history: Array<{ at: string; event: string }>;
}
export async function saveQuote(q: QuoteRecord) {
  await (await kv()).set(`quotes/${q.ref}`, q);
}
export async function getQuote(ref: string) {
  if (!/^FFQ-\d{6}-[0-9A-F]{6}$/.test(ref)) return null;
  return (await kv()).get<QuoteRecord>(`quotes/${ref}`);
}
export async function listQuotes(): Promise<QuoteRecord[]> {
  return (await readAll<QuoteRecord>("quotes/")).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ---------- Orders ----------
export type OrderStatus = "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
export interface OrderRecord {
  id: string; // FF-123456
  stripeSessionId: string;
  createdAt: string;
  status: OrderStatus;
  email: string;
  shipTo: { name: string; line1: string; line2: string; city: string; state: string; zip: string } | null;
  items: Array<{ sku: string; name: string; qty: number; unitCents: number }>;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  tracking: { carrier: string; number: string } | null;
  internalNote: string;
  history: Array<{ at: string; event: string }>;
}
export const newOrderId = () => `FF-${(100000 + (randomBytes(4).readUInt32BE() % 900000)).toString()}`;
export async function saveOrder(o: OrderRecord) {
  await (await kv()).set(`orders/${o.id}`, o);
}
export async function getOrder(id: string) {
  if (!/^FF-\d{6}$/.test(id)) return null;
  return (await kv()).get<OrderRecord>(`orders/${id}`);
}
export async function listOrders(): Promise<OrderRecord[]> {
  return (await readAll<OrderRecord>("orders/")).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
/** Stripe retries webhooks, so each Checkout session is recorded once. */
export async function orderIdForSession(sessionId: string) {
  return (await kv()).get<{ orderId: string }>(`order-sessions/${sessionId.replace(/[^A-Za-z0-9_]/g, "")}`);
}
export async function linkSession(sessionId: string, orderId: string) {
  await (await kv()).set(`order-sessions/${sessionId.replace(/[^A-Za-z0-9_]/g, "")}`, { orderId });
}

// ---------- Catalog overrides (admin edits on top of the base catalog) ----------
export interface ProOverride {
  hidden?: boolean;
  summary?: string;
  leadTime?: string;
  tiers?: Array<{ minQty: number; maxQty: number | null; priceCents: number }>;
  customReason?: string;
}
export interface ShopOverride {
  hidden?: boolean;
  summary?: string;
  priceCents?: number;
  compareAtCents?: number | null;
  soldOut?: string[];
  transit?: { minDays: number; maxDays: number };
}
export interface CatalogOverrides {
  pro: Record<string, ProOverride>;
  shop: Record<string, ShopOverride>;
  updatedAt: string | null;
}
const EMPTY: CatalogOverrides = { pro: {}, shop: {}, updatedAt: null };

export async function getOverrides(): Promise<CatalogOverrides> {
  try {
    return (await (await kv()).get<CatalogOverrides>("catalog/overrides")) ?? EMPTY;
  } catch (err) {
    // Storage unavailable (e.g. during a build without Blobs access): serve the base catalog.
    console.warn("[catalog] overrides unavailable:", err instanceof Error ? err.message : err);
    return EMPTY;
  }
}
export async function setOverrides(o: CatalogOverrides) {
  await (await kv()).set("catalog/overrides", { ...o, updatedAt: new Date().toISOString() });
}

// ---------- Audit log ----------
export interface AuditEntry {
  at: string;
  action: string;
  detail: string;
}
export async function audit(action: string, detail: string) {
  const at = new Date().toISOString();
  await (await kv()).set(`audit/${at.replace(/[:.]/g, "-")}_${randomBytes(3).toString("hex")}`, { at, action, detail: detail.slice(0, 300) } satisfies AuditEntry);
}
export async function listAudit(limit = 30): Promise<AuditEntry[]> {
  const store = await kv();
  const keys = (await store.list("audit/")).sort().reverse().slice(0, limit);
  return (await Promise.all(keys.map((k) => store.get<AuditEntry>(k)))).filter((x): x is AuditEntry => Boolean(x));
}
