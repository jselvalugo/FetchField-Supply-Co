import { z } from "zod";
import { SupplierError } from "../errors";
import { toCents } from "../money";
import type {
  CountryCode,
  ShippingOption,
  StockPrice,
  SupplierAdapter,
  SupplierLine,
  SupplierOrderRef,
  SupplierOrderRequest,
  SupplierOrderStatus,
  SupplierProduct,
} from "../types";
import { parseCsv } from "./parse";

/**
 * For wholesale deals negotiated directly with manufacturers (spec §8.1).
 * The supplier sends a price/stock sheet; an admin uploads it. Orders are
 * "placed" by generating a PO that a person sends. There is no API call, so
 * the order is marked manual_pending until tracking is entered by hand.
 *
 * Expected header:
 * external_id,sku,title,option_name,option_value,cost_usd,stock,min_days,max_days,ships_from,shipping_usd
 */
const Row = z.object({
  external_id: z.string().regex(/^[A-Za-z0-9._-]{1,64}$/),
  sku: z.string().regex(/^[A-Za-z0-9._-]{1,64}$/),
  title: z.string().min(1).max(300),
  option_name: z.string().max(40).default(""),
  option_value: z.string().max(80).default(""),
  cost_usd: z.string(),
  stock: z.coerce.number().int().min(0),
  min_days: z.coerce.number().int().min(0).max(120),
  max_days: z.coerce.number().int().min(0).max(120),
  ships_from: z.string().length(2),
  shipping_usd: z.string().default("0"),
});
type RowT = z.infer<typeof Row>;

export class CsvSupplierAdapter implements SupplierAdapter {
  private rows: RowT[] = [];
  private loadedAt: Date | null = null;

  constructor(
    readonly id: string,
    private readonly loadSheet: () => Promise<string>,
    private readonly now: () => Date = () => new Date(),
  ) {
    if (!/^csv-[a-z0-9-]{1,40}$/.test(id)) throw new Error("CSV adapter id must look like csv-<name>");
  }

  /** Parses and validates the whole sheet. Any bad row rejects the sheet, so a half-valid file is never used. */
  async reload(): Promise<{ rows: number }> {
    const table = parseCsv(await this.loadSheet());
    const [header, ...body] = table;
    if (!header) throw new SupplierError("invalid_response", `${this.id}: empty sheet`);
    const keys = header.map((h) => h.trim().toLowerCase());
    const parsed: RowT[] = [];
    body.forEach((cells, i) => {
      const obj = Object.fromEntries(keys.map((k, j) => [k, (cells[j] ?? "").trim()]));
      const r = Row.safeParse(obj);
      if (!r.success || toCents(r.data.cost_usd) === null || r.data.max_days < r.data.min_days) {
        throw new SupplierError("invalid_response", `${this.id}: row ${i + 2} is invalid`);
      }
      parsed.push(r.data);
    });
    this.rows = parsed;
    this.loadedAt = this.now();
    return { rows: parsed.length };
  }

  private async ensure() {
    if (!this.loadedAt) await this.reload();
  }

  async fetchProduct(externalId: string): Promise<SupplierProduct> {
    await this.ensure();
    const rows = this.rows.filter((r) => r.external_id === externalId);
    if (rows.length === 0) throw new SupplierError("rejected", `${this.id}: ${externalId} not in sheet`);
    const first = rows[0]!;
    return {
      adapterId: this.id,
      externalId,
      title: first.title,
      listed: true,
      descriptionText: "",
      images: [],
      skus: rows.map((r) => ({
        externalSkuId: r.sku,
        options: r.option_name ? { [r.option_name]: r.option_value } : {},
        costCents: toCents(r.cost_usd)!,
        currency: "USD",
        stock: r.stock,
      })),
      shipWindow: { minDays: first.min_days, maxDays: first.max_days, shipsFrom: first.ships_from },
      packageDims: null,
      store: null,
      fetchedAt: this.loadedAt!,
      raw: rows,
    };
  }

  async fetchStockAndPrice(externalIds: string[], _shipTo: CountryCode): Promise<StockPrice[]> {
    await this.reload();
    const wanted = new Set(externalIds);
    return this.rows
      .filter((r) => wanted.has(r.external_id))
      .map((r) => ({
        externalId: r.external_id,
        externalSkuId: r.sku,
        costCents: toCents(r.cost_usd)!,
        stock: r.stock,
        available: r.stock > 0,
      }));
  }

  async quoteShipping(items: SupplierLine[]): Promise<ShippingOption[]> {
    await this.ensure();
    let cost = 0;
    let min = 0;
    let max = 0;
    for (const l of items) {
      const r = this.rows.find((x) => x.external_id === l.externalId && x.sku === l.externalSkuId);
      if (!r) throw new SupplierError("rejected", `${this.id}: unknown SKU ${l.externalSkuId}`);
      cost += toCents(r.shipping_usd)! * l.quantity;
      min = Math.max(min, r.min_days);
      max = Math.max(max, r.max_days);
    }
    return [{ serviceCode: "standard", label: "Supplier standard freight", costCents: cost, minDays: min, maxDays: max, tracked: true }];
  }

  async placeOrder(order: SupplierOrderRequest): Promise<SupplierOrderRef> {
    return { adapterId: this.id, externalOrderIds: [`PO-${order.idempotencyKey}`] };
  }

  async getOrderStatus(): Promise<SupplierOrderStatus> {
    return { state: "manual_pending", tracking: [], updatedAt: this.now() };
  }
}
