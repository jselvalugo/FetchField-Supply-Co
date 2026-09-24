/**
 * Supplier-facing domain types. Everything here is internal: it may contain
 * supplier names, costs and IDs, and must never be sent to a customer. Use
 * `public/projection.ts` to build anything customer-facing.
 */

/** Integer cents. Money is never a float in this package. */
export type Cents = number & { readonly __brand?: "cents" };

/** ISO 3166-1 alpha-2, e.g. "US". */
export type CountryCode = string;

export interface Address {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  region: string; // state / province code, e.g. "OR"
  postalCode: string;
  country: CountryCode;
  phone: string; // carriers require one; we never show it to suppliers' storefronts
}

export interface SupplierSku {
  externalSkuId: string;
  /** Human-readable option set, e.g. { Color: "Moss", Size: "M" }. */
  options: Record<string, string>;
  costCents: Cents;
  currency: "USD";
  stock: number;
}

export interface SupplierImage {
  url: string;
  role: "main" | "gallery" | "sku";
}

export interface SupplierShipWindow {
  minDays: number;
  maxDays: number;
  shipsFrom: CountryCode;
}

/** Raw-ish product as fetched. Lands in the `supplier_products` staging table. */
export interface SupplierProduct {
  adapterId: string;
  externalId: string;
  title: string;
  /** False when the supplier has delisted the product. */
  listed: boolean;
  /** Plain text only. HTML is stripped at the adapter boundary. */
  descriptionText: string;
  images: SupplierImage[];
  skus: SupplierSku[];
  shipWindow: SupplierShipWindow | null;
  packageDims: { lengthCm: number; widthCm: number; heightCm: number; weightKg: number } | null;
  store: { id: string; name: string; rating: number | null; followers: number | null } | null;
  fetchedAt: Date;
  /** Original payload, kept for audit and for re-parsing if the schema changes. */
  raw: unknown;
}

export interface StockPrice {
  externalId: string;
  externalSkuId: string;
  costCents: Cents;
  stock: number;
  available: boolean;
}

export interface SupplierLine {
  externalId: string;
  externalSkuId: string;
  quantity: number;
}

export interface ShippingOption {
  serviceCode: string;
  label: string;
  costCents: Cents;
  minDays: number;
  maxDays: number;
  tracked: boolean;
}

export interface SupplierOrderRequest {
  /** Our SupplierOrder id; used as the idempotency key. */
  idempotencyKey: string;
  lines: Array<SupplierLine & { shippingServiceCode: string }>;
  shipTo: Address;
  /** Internal reference only (e.g. our order number). Never customer PII beyond the address. */
  memo?: string;
}

export interface SupplierOrderRef {
  adapterId: string;
  externalOrderIds: string[];
}

export type SupplierOrderState =
  | "placed"
  | "awaiting_payment"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "manual_pending"
  | "unknown";

export interface TrackingInfo {
  carrier: string;
  trackingNumber: string;
  trackingUrl: string | null;
  events: Array<{ at: Date; description: string; location: string | null }>;
}

export interface SupplierOrderStatus {
  state: SupplierOrderState;
  tracking: TrackingInfo[];
  updatedAt: Date;
}

/** Spec §8.2. One supplier among several. */
export interface SupplierAdapter {
  readonly id: string;
  fetchProduct(externalId: string, shipTo: CountryCode): Promise<SupplierProduct>;
  fetchStockAndPrice(externalIds: string[], shipTo: CountryCode): Promise<StockPrice[]>;
  quoteShipping(items: SupplierLine[], address: Address): Promise<ShippingOption[]>;
  placeOrder(order: SupplierOrderRequest): Promise<SupplierOrderRef>;
  getOrderStatus(ref: SupplierOrderRef): Promise<SupplierOrderStatus>;
}
