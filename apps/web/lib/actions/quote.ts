"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { tierFor } from "@fetchfield/ui";
import { findProProduct } from "@/lib/catalog";
import { rateLimit } from "@/lib/server/rate-limit";
import { sendEmail } from "@/lib/server/email";
import { site } from "@/lib/site";

const Line = z.object({
  slug: z.string().regex(/^[a-z0-9-]{1,80}$/),
  qty: z.number().int().min(1).max(100_000),
  note: z.string().max(500).default(""),
});

const QuoteForm = z.object({
  orgName: z.string().trim().min(2, "Enter your organization's name").max(160),
  orgType: z.enum(["city", "parks", "hoa", "apartment", "contractor", "other"], { message: "Choose an organization type" }),
  buyerName: z.string().trim().min(2, "Enter your name").max(120),
  buyerRole: z.string().trim().max(120).default(""),
  email: z.string().trim().email("Enter a valid email address").max(200),
  phone: z.string().trim().max(40).default(""),
  zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Enter a 5-digit ZIP"),
  neededBy: z.string().trim().max(10).refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use a valid date").default(""),
  install: z.enum(["yes", "no", "unsure"]),
  taxExempt: z.enum(["yes", "no"]),
  bidNumber: z.string().trim().max(80).default(""),
  notes: z.string().trim().max(2000).default(""),
  lines: z.array(Line).min(1, "Your quote list is empty").max(100),
});

export type QuoteState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors: Record<string, string> }
  | {
      status: "ok";
      ref: string;
      email: string;
      lines: Array<{ name: string; model: string; qty: number; unit: string; unitCents: number | null; lineCents: number | null }>;
      subtotalCents: number;
      hasCustom: boolean;
      expires: string;
    };

const ORG_LABEL = { city: "City / county", parks: "Parks department", hoa: "HOA", apartment: "Apartment community", contractor: "Contractor", other: "Other" };

export async function submitQuote(_prev: QuoteState, formData: FormData): Promise<QuoteState> {
  // Honeypot: real people never see or fill this field.
  if (String(formData.get("website") ?? "") !== "") return { status: "error", message: "Something went wrong. Please email us instead.", fieldErrors: {} };
  if (!(await rateLimit("quote", 5, 10 * 60_000))) {
    return { status: "error", message: "Too many quote requests from this network. Try again in a few minutes, or email us.", fieldErrors: {} };
  }

  let lines: unknown;
  try {
    lines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    lines = [];
  }
  const parsed = QuoteForm.safeParse({ ...Object.fromEntries(formData), lines });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = String(i.path[0] ?? "form");
      fieldErrors[k] ??= i.message;
    }
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }
  const q = parsed.data;

  // Re-price from the catalog. Anything the browser sent besides slug/qty/note is ignored.
  const priced = [];
  for (const l of q.lines) {
    const p = findProProduct(l.slug);
    if (!p) return { status: "error", message: "One item in your list is no longer available. Remove it and try again.", fieldErrors: {} };
    const unit = p.pricing.kind === "tiers" ? tierFor(p.pricing.tiers, l.qty).priceCents : null;
    priced.push({ name: p.name, model: p.model, qty: l.qty, unit: p.pricing.kind === "tiers" ? p.pricing.unit : "site", unitCents: unit, lineCents: unit === null ? null : unit * l.qty, note: l.note });
  }
  const subtotalCents = priced.reduce((s, l) => s + (l.lineCents ?? 0), 0);
  const ref = `FFQ-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${randomBytes(3).toString("hex").toUpperCase()}`;
  const expires = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

  // TODO(backend): persist to the quotes module (Medusa) so admins can review. Until then the
  // team inbox copy below is the record of the request.
  const summary = [
    `Reference: ${ref}`,
    `Organization: ${q.orgName} (${ORG_LABEL[q.orgType]})`,
    `Buyer: ${q.buyerName}${q.buyerRole ? `, ${q.buyerRole}` : ""} <${q.email}> ${q.phone}`,
    `Deliver to ZIP ${q.zip}${q.neededBy ? `, needed by ${q.neededBy}` : ""}. Install: ${q.install}. Tax-exempt: ${q.taxExempt}.`,
    q.bidNumber ? `Bid / solicitation: ${q.bidNumber}` : "",
    "",
    ...priced.map((l) => `${l.qty} × ${l.name} (${l.model}) ${l.unitCents === null ? "priced per site" : `@ $${(l.unitCents / 100).toFixed(2)} = $${((l.lineCents ?? 0) / 100).toFixed(2)}`}${l.note ? ` [${l.note}]` : ""}`),
    "",
    `Draft subtotal (list, before tax/freight): $${(subtotalCents / 100).toFixed(2)}`,
    q.notes ? `Notes: ${q.notes}` : "",
  ].filter((s) => s !== "").join("\n");

  await Promise.all([
    sendEmail({ to: site.quotesEmail, subject: `Quote request ${ref}: ${q.orgName}`, text: summary }),
    sendEmail({
      to: q.email,
      subject: `We received your quote request (${ref})`,
      text: `Thanks, ${q.buyerName}. We'll send a final quote with freight, tax and install within ${site.quoteResponse}.\n\n${summary}\n\nThis draft is based on list pricing and isn't an offer until we send the final quote.`,
    }),
  ]);

  return { status: "ok", ref, email: q.email, lines: priced, subtotalCents, hasCustom: priced.some((l) => l.unitCents === null), expires };
}
