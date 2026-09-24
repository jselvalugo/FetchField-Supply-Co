import type { AlertSink } from "../alerts";
import { SupplierError } from "../errors";
import { marginAt, type PricingRule } from "../pricing/rules";
import type { CountryCode, StockPrice, SupplierAdapter } from "../types";

export type Availability = "available" | "sold_out" | "hidden_margin";

export interface SyncLink {
  linkId: string;
  adapterId: string;
  externalId: string;
  externalSkuId: string;
  /** Lower = preferred supplier for this variant. */
  priority: number;
  /** Our landed shipping cost estimate for this link, per unit. */
  shippingCents: number;
  costCents: number;
  stock: number;
  syncedAt: Date | null;
}

export interface SyncVariant {
  variantId: string;
  /** Published retail price. The sync never changes it; a person reprices. */
  priceCents: number;
  availability: Availability;
  links: SyncLink[];
}

export interface SyncRepo {
  listPublishedVariants(): Promise<SyncVariant[]>;
  updateLink(linkId: string, u: { costCents: number; stock: number; available: boolean; syncedAt: Date }): Promise<void>;
  setAvailability(variantId: string, availability: Availability, activeLinkId: string | null): Promise<void>;
}

export interface SyncSummary {
  variants: number;
  linksUpdated: number;
  soldOut: string[];
  hiddenForMargin: string[];
  restored: string[];
  failedAdapters: string[];
}

export interface SyncDeps {
  adapters: Map<string, SupplierAdapter>;
  repo: SyncRepo;
  rule: PricingRule;
  alerts: AlertSink;
  shipTo: CountryCode;
  now?: () => Date;
}

/**
 * The 6-hourly stock and price sync (spec §8.4). Also used on demand for the
 * variants in a cart before checkout, by passing `onlyVariantIds`.
 *
 * Per variant, the preferred in-stock link wins. With no in-stock link the
 * variant is sold out, so we never oversell. If the best link's cost pushes
 * margin under the floor, the variant is hidden and an admin is alerted.
 * We never silently sell at a loss, and never silently reprice.
 * If a supplier can't be reached, its variants keep their last known state.
 * The staleness check alerts if that lasts more than 24h.
 */
export async function runStockPriceSync(deps: SyncDeps, onlyVariantIds?: string[]): Promise<SyncSummary> {
  const now = deps.now ?? (() => new Date());
  let variants = await deps.repo.listPublishedVariants();
  if (onlyVariantIds) {
    const want = new Set(onlyVariantIds);
    variants = variants.filter((v) => want.has(v.variantId));
  }
  const summary: SyncSummary = { variants: variants.length, linksUpdated: 0, soldOut: [], hiddenForMargin: [], restored: [], failedAdapters: [] };

  // 1. Fetch fresh data, grouped by adapter.
  const byAdapter = new Map<string, Set<string>>();
  for (const v of variants) for (const l of v.links) {
    if (!byAdapter.has(l.adapterId)) byAdapter.set(l.adapterId, new Set());
    byAdapter.get(l.adapterId)!.add(l.externalId);
  }
  const fresh = new Map<string, StockPrice>(); // key adapter|externalId|sku
  const productGone = new Set<string>(); // adapter|externalId
  for (const [adapterId, ids] of byAdapter) {
    const adapter = deps.adapters.get(adapterId);
    if (!adapter) {
      summary.failedAdapters.push(adapterId);
      await deps.alerts.alert({ level: "critical", code: "sync_failed", message: `No adapter registered for ${adapterId}` });
      continue;
    }
    try {
      for (const sp of await adapter.fetchStockAndPrice([...ids], deps.shipTo)) {
        if (sp.externalSkuId === "*") productGone.add(`${adapterId}|${sp.externalId}`);
        else fresh.set(`${adapterId}|${sp.externalId}|${sp.externalSkuId}`, sp);
      }
    } catch (err) {
      summary.failedAdapters.push(adapterId);
      const kind = err instanceof SupplierError ? err.kind : "unknown";
      await deps.alerts.alert({
        level: kind === "auth" ? "critical" : "warn",
        code: kind === "auth" ? "auth_expired" : "sync_failed",
        message: `Sync for ${adapterId} failed (${kind}): ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // 2. Update links and decide availability per variant.
  const at = now();
  for (const v of variants) {
    for (const l of v.links) {
      const sp = fresh.get(`${l.adapterId}|${l.externalId}|${l.externalSkuId}`);
      const gone = productGone.has(`${l.adapterId}|${l.externalId}`);
      if (!sp && !gone) continue; // adapter failed; leave as is
      const update = sp
        ? { costCents: sp.costCents, stock: sp.available ? sp.stock : 0, available: sp.available, syncedAt: at }
        : { costCents: l.costCents, stock: 0, available: false, syncedAt: at };
      // A SKU missing from a successful fetch has been removed by the supplier.
      l.costCents = update.costCents;
      l.stock = update.stock;
      l.syncedAt = at;
      await deps.repo.updateLink(l.linkId, update);
      summary.linksUpdated++;
    }
    // Links from adapters we couldn't reach this run keep their old numbers.
    const failed = new Set(summary.failedAdapters);
    const skuMissing = (l: SyncLink) =>
      !failed.has(l.adapterId) &&
      !productGone.has(`${l.adapterId}|${l.externalId}`) &&
      !fresh.has(`${l.adapterId}|${l.externalId}|${l.externalSkuId}`);
    const candidates = v.links
      .filter((l) => l.stock > 0 && !skuMissing(l))
      .sort((a, b) => a.priority - b.priority);

    let next: Availability;
    let active: string | null = null;
    if (candidates.length === 0) {
      next = "sold_out";
    } else {
      // Prefer the highest-priority link that still clears the margin floor.
      const ok = candidates.find((l) => !marginAt(v.priceCents, { costCents: l.costCents, shippingCents: l.shippingCents }, deps.rule).belowFloor);
      if (ok) {
        next = "available";
        active = ok.linkId;
      } else {
        next = "hidden_margin";
      }
    }

    if (next !== v.availability) {
      await deps.repo.setAvailability(v.variantId, next, active);
      if (next === "sold_out") {
        summary.soldOut.push(v.variantId);
        await deps.alerts.alert({ level: "info", code: "sold_out", message: "Variant sold out at every linked supplier", ref: v.variantId });
      } else if (next === "hidden_margin") {
        summary.hiddenForMargin.push(v.variantId);
        const best = candidates[0]!;
        const m = marginAt(v.priceCents, { costCents: best.costCents, shippingCents: best.shippingCents }, deps.rule);
        await deps.alerts.alert({
          level: "warn",
          code: "margin_below_floor",
          message: `Hidden: margin ${(m.margin * 100).toFixed(1)}% is under the ${(deps.rule.marginFloor * 100).toFixed(0)}% floor. Reprice or switch supplier.`,
          ref: v.variantId,
        });
      } else {
        summary.restored.push(v.variantId);
      }
    } else if (next === "available" && active) {
      await deps.repo.setAvailability(v.variantId, next, active);
    }
  }
  return summary;
}

/** Alerts for published variants whose supplier data is more than `maxAgeMs` old (spec §8.4). */
export async function checkStaleness(
  repo: Pick<SyncRepo, "listPublishedVariants">,
  alerts: AlertSink,
  now: Date = new Date(),
  maxAgeMs = 24 * 60 * 60 * 1000,
): Promise<string[]> {
  const stale: string[] = [];
  for (const v of await repo.listPublishedVariants()) {
    const newest = Math.max(0, ...v.links.map((l) => l.syncedAt?.getTime() ?? 0));
    if (now.getTime() - newest > maxAgeMs) stale.push(v.variantId);
  }
  if (stale.length) {
    await alerts.alert({
      level: "warn",
      code: "sync_stale",
      message: `${stale.length} published variant(s) haven't synced in over 24h`,
    });
  }
  return stale;
}
