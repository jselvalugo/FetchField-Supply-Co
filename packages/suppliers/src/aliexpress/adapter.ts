import type { z } from "zod";
import { SupplierError } from "../errors";
import { withRetry } from "../http/guards";
import { htmlToPlainText } from "../content/sanitize";
import { toCents } from "../money";
import type {
  Address,
  CountryCode,
  ShippingOption,
  StockPrice,
  SupplierAdapter,
  SupplierImage,
  SupplierLine,
  SupplierOrderRef,
  SupplierOrderRequest,
  SupplierOrderState,
  SupplierOrderStatus,
  SupplierProduct,
  SupplierSku,
} from "../types";
import type { AeClient } from "./client";
import { AE_IMAGE_HOSTS } from "./config";
import { hostAllowed } from "../http/secure-fetch";
import { FreightResponse, OrderCreateResponse, OrderGetResponse, ProductGetResponse, type Sku } from "./schemas";

/**
 * AliExpress SKU references are opaque to the rest of the system. We need
 * both `sku_id` (freight quotes) and `sku_attr` (order placement), so the
 * adapter packs them into one string.
 */
export const encodeSkuRef = (skuId: string, skuAttr: string) => `${skuId}|${skuAttr}`;
export function decodeSkuRef(ref: string): { skuId: string; skuAttr: string } {
  const i = ref.indexOf("|");
  if (i < 1) throw new SupplierError("rejected", "Malformed AliExpress SKU reference");
  return { skuId: ref.slice(0, i), skuAttr: ref.slice(i + 1) };
}

function parse<T extends z.ZodTypeAny>(schema: T, json: unknown, what: string): z.infer<T> {
  const r = schema.safeParse(json);
  if (!r.success) {
    const issue = r.error.issues[0];
    throw new SupplierError("invalid_response", `AliExpress ${what}: unexpected shape at ${issue?.path.join(".") ?? "?"}`, {
      adapterId: "aliexpress",
    });
  }
  return r.data;
}

const STATUS_MAP: Record<string, SupplierOrderState> = {
  PLACE_ORDER_SUCCESS: "awaiting_payment",
  WAIT_BUYER_PAY: "awaiting_payment",
  PAYMENT_PROCESSING: "processing",
  WAIT_SELLER_SEND_GOODS: "processing",
  SELLER_PART_SEND_GOODS: "shipped",
  WAIT_BUYER_ACCEPT_GOODS: "shipped",
  FUND_PROCESSING: "shipped",
  FINISH: "delivered",
  IN_CANCEL: "cancelled",
  IN_ISSUE: "processing",
  IN_FROZEN: "processing",
};

export class AliExpressAdapter implements SupplierAdapter {
  readonly id = "aliexpress";
  constructor(
    private readonly client: Pick<AeClient, "call">,
    private readonly opts: { currency?: "USD"; language?: string; now?: () => Date } = {},
  ) {}

  private now() {
    return this.opts.now?.() ?? new Date();
  }

  async fetchProduct(externalId: string, shipTo: CountryCode): Promise<SupplierProduct> {
    assertProductId(externalId);
    const json = await withRetry(() =>
      this.client.call("aliexpress.ds.product.get", {
        product_id: externalId,
        ship_to_country: shipTo,
        target_currency: this.opts.currency ?? "USD",
        target_language: this.opts.language ?? "EN",
      }),
    );
    const r = parse(ProductGetResponse, json, "product.get").aliexpress_ds_product_get_response.result;
    const base = r.ae_item_base_info_dto;

    const images: SupplierImage[] = (r.ae_multimedia_info_dto?.image_urls ?? "")
      .split(";")
      .map((u) => u.trim())
      .filter((u) => isAllowedImage(u))
      .map((url, i) => ({ url, role: i === 0 ? "main" : "gallery" }));

    const skus = r.ae_item_sku_info_dtos.map((s) => toSku(s));
    const pkg = r.package_info_dto;
    const days = r.logistics_info_dto?.delivery_time;

    return {
      adapterId: this.id,
      externalId: base.product_id,
      title: base.subject.slice(0, 500),
      listed: base.product_status_type === undefined || base.product_status_type === "onSelling",
      descriptionText: htmlToPlainText(base.detail),
      images,
      skus,
      // product.get gives a single delivery_time; the curator confirms a range via freight quote.
      shipWindow: days ? { minDays: days, maxDays: days, shipsFrom: "CN" } : null,
      packageDims:
        pkg?.package_length && pkg.package_width && pkg.package_height && pkg.gross_weight
          ? {
              lengthCm: pkg.package_length,
              widthCm: pkg.package_width,
              heightCm: pkg.package_height,
              weightKg: pkg.gross_weight,
            }
          : null,
      store: r.ae_store_info
        ? {
            id: r.ae_store_info.store_id,
            name: r.ae_store_info.store_name,
            rating: r.ae_store_info.item_as_described_rating ?? null,
            followers: null,
          }
        : null,
      fetchedAt: this.now(),
      raw: json,
    };
  }

  async fetchStockAndPrice(externalIds: string[], shipTo: CountryCode): Promise<StockPrice[]> {
    // The DS API has no batch endpoint; the client's rate limiter paces these calls.
    const out: StockPrice[] = [];
    for (const id of externalIds) {
      try {
        const p = await this.fetchProduct(id, shipTo);
        for (const s of p.skus) {
          out.push({ externalId: id, externalSkuId: s.externalSkuId, costCents: s.costCents, stock: s.stock, available: p.listed && s.stock > 0 });
        }
      } catch (err) {
        // A delisted product is reported as unavailable instead of failing the whole batch.
        if (err instanceof SupplierError && err.kind === "rejected") {
          out.push({ externalId: id, externalSkuId: "*", costCents: 0, stock: 0, available: false });
          continue;
        }
        throw err;
      }
    }
    return out;
  }

  async quoteShipping(items: SupplierLine[], address: Address): Promise<ShippingOption[]> {
    // AliExpress quotes freight per product; we return options that work for every line
    // and sum their costs. Delivery days take the slowest line.
    const perLine: ShippingOption[][] = [];
    for (const line of items) {
      assertProductId(line.externalId);
      const { skuId } = decodeSkuRef(line.externalSkuId);
      const json = await withRetry(() =>
        this.client.call("aliexpress.ds.freight.query", {
          queryDeliveryReq: JSON.stringify({
            quantity: line.quantity,
            shipToCountry: address.country,
            provinceCode: address.region,
            productId: line.externalId,
            selectedSkuId: skuId,
            language: "en_US",
            currency: "USD",
            locale: "en_US",
          }),
        }),
      );
      const opts = parse(FreightResponse, json, "freight.query").aliexpress_ds_freight_query_response.result.delivery_options;
      perLine.push(
        opts.map((o) => ({
          serviceCode: o.code,
          label: o.company ?? o.code,
          costCents: o.free_shipping === true || o.free_shipping === "true" ? 0 : Number(o.shipping_fee_cent ?? 0),
          minDays: o.min_delivery_days ?? 0,
          maxDays: o.max_delivery_days ?? 0,
          tracked: o.tracking === undefined ? true : o.tracking === true || o.tracking === "true",
        })),
      );
    }
    if (perLine.length === 0) return [];
    const common = perLine[0]!.filter((o) => perLine.every((l) => l.some((x) => x.serviceCode === o.serviceCode)));
    return common
      .map((o) => {
        const matches = perLine.map((l) => l.find((x) => x.serviceCode === o.serviceCode)!);
        return {
          ...o,
          costCents: matches.reduce((sum, m) => sum + m.costCents, 0),
          minDays: Math.max(...matches.map((m) => m.minDays)),
          maxDays: Math.max(...matches.map((m) => m.maxDays)),
          tracked: matches.every((m) => m.tracked),
        };
      })
      .filter((o) => o.maxDays > 0);
  }

  /**
   * Places a dropship order. NOT retried here: AliExpress has no idempotency
   * key, so a timeout after sending could mean the order exists. Such cases
   * surface as `unknown_outcome` and the forwarding job parks the order for a
   * human to check. The idempotency key goes in the order memo so it can be
   * found in the AliExpress order list.
   */
  async placeOrder(order: SupplierOrderRequest): Promise<SupplierOrderRef> {
    if (order.lines.length === 0) throw new SupplierError("rejected", "Order has no lines");
    const a = order.shipTo;
    const payload = {
      logistics_address: {
        full_name: a.name,
        contact_person: a.name,
        address: a.line1,
        address2: a.line2 ?? "",
        city: a.city,
        province: a.region,
        zip: a.postalCode,
        country: a.country,
        mobile_no: a.phone.replace(/[^\d]/g, ""),
        phone_country: a.country === "US" ? "+1" : "",
      },
      product_items: order.lines.map((l) => {
        assertProductId(l.externalId);
        if (!Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > 999) {
          throw new SupplierError("rejected", "Invalid quantity");
        }
        return {
          product_id: l.externalId,
          product_count: l.quantity,
          sku_attr: decodeSkuRef(l.externalSkuId).skuAttr,
          logistics_service_name: l.shippingServiceCode,
          order_memo: `FF ${order.idempotencyKey}`,
        };
      }),
    };

    let json: unknown;
    try {
      json = await this.client.call("aliexpress.ds.order.create", {
        param_place_order_request4_open_api_d_t_o: JSON.stringify(payload),
      });
    } catch (err) {
      if (err instanceof SupplierError && (err.kind === "transient" || err.kind === "invalid_response")) {
        throw new SupplierError("unknown_outcome", `Order placement outcome unknown: ${err.message}`, { adapterId: this.id });
      }
      throw err;
    }
    let r;
    try {
      r = parse(OrderCreateResponse, json, "order.create").aliexpress_ds_order_create_response.result;
    } catch {
      throw new SupplierError("unknown_outcome", "Order placement response unreadable", { adapterId: this.id });
    }
    const ids = r.order_list?.number ?? [];
    if (!r.is_success || ids.length === 0) {
      throw new SupplierError("rejected", `AliExpress refused the order: ${r.error_msg ?? r.error_code ?? "no reason given"}`, {
        adapterId: this.id,
        code: r.error_code,
      });
    }
    return { adapterId: this.id, externalOrderIds: ids };
  }

  async getOrderStatus(ref: SupplierOrderRef): Promise<SupplierOrderStatus> {
    const statuses: SupplierOrderStatus[] = [];
    for (const orderId of ref.externalOrderIds) {
      if (!/^\d{6,24}$/.test(orderId)) throw new SupplierError("rejected", "Malformed AliExpress order id");
      const json = await withRetry(() =>
        this.client.call("aliexpress.ds.trade.order.get", { single_order_query: JSON.stringify({ order_id: orderId }) }),
      );
      const r = parse(OrderGetResponse, json, "trade.order.get").aliexpress_ds_trade_order_get_response.result;
      statuses.push({
        state: STATUS_MAP[r.order_status] ?? "unknown",
        tracking: r.logistics_info_list
          .filter((l) => l.logistics_no)
          .map((l) => ({ carrier: l.logistics_service ?? "Carrier", trackingNumber: l.logistics_no!, trackingUrl: null, events: [] })),
        updatedAt: this.now(),
      });
    }
    return mergeStatuses(statuses, this.now());
  }
}

/** A split order is only as far along as its slowest part. */
export function mergeStatuses(parts: SupplierOrderStatus[], now: Date): SupplierOrderStatus {
  const order: SupplierOrderState[] = ["unknown", "manual_pending", "placed", "awaiting_payment", "processing", "shipped", "delivered"];
  if (parts.length === 0) return { state: "unknown", tracking: [], updatedAt: now };
  const live = parts.filter((p) => p.state !== "cancelled");
  const state =
    live.length === 0
      ? "cancelled"
      : live.reduce<SupplierOrderState>((min, p) => (order.indexOf(p.state) < order.indexOf(min) ? p.state : min), "delivered");
  return { state, tracking: parts.flatMap((p) => p.tracking), updatedAt: now };
}

function toSku(s: z.infer<typeof Sku>): SupplierSku {
  const cost = toCents(s.offer_sale_price ?? s.sku_price ?? null);
  if (cost === null || cost <= 0) {
    throw new SupplierError("invalid_response", `AliExpress SKU ${s.sku_id} has no usable price`, { adapterId: "aliexpress" });
  }
  if (s.currency_code && s.currency_code !== "USD") {
    throw new SupplierError("invalid_response", `AliExpress SKU ${s.sku_id} priced in ${s.currency_code}, expected USD`);
  }
  const options: Record<string, string> = {};
  for (const p of s.ae_sku_property_dtos) {
    if (p.sku_property_name) options[p.sku_property_name] = p.property_value_definition_name || p.sku_property_value || "";
  }
  return {
    externalSkuId: encodeSkuRef(s.sku_id, s.sku_attr),
    options,
    costCents: cost,
    currency: "USD",
    stock: Math.max(0, Math.floor(s.sku_available_stock ?? 0)),
  };
}

function isAllowedImage(u: string): boolean {
  try {
    const url = new URL(u.startsWith("//") ? `https:${u}` : u);
    return url.protocol === "https:" && hostAllowed(url.hostname, AE_IMAGE_HOSTS);
  } catch {
    return false;
  }
}

function assertProductId(id: string) {
  if (!/^\d{6,24}$/.test(id)) throw new SupplierError("rejected", "Malformed AliExpress product id");
}
