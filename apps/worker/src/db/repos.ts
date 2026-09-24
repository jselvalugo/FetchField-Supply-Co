import type {
  Alert,
  AlertSink,
  AeToken,
  AeTokenStore,
  Availability,
  ForwardingRepo,
  SupplierOrderRef,
  SupplierOrderRequest,
  SupplierOrderRow,
  SupplierOrderStatus,
  SyncRepo,
  SyncVariant,
  TokenVault,
} from "@fetchfield/suppliers";
import type { Db } from "./pool";

/** AliExpress token, encrypted at rest. Plaintext exists only in memory while a request is signed. */
export class PgTokenStore implements AeTokenStore {
  constructor(private readonly db: Db, private readonly vault: TokenVault, private readonly adapterId = "aliexpress") {}

  async load(): Promise<AeToken | null> {
    const { rows } = await this.db.query(
      `SELECT access_token_enc, refresh_token_enc, access_expires_at, refresh_expires_at, account FROM supplier_credentials WHERE adapter_id = $1`,
      [this.adapterId],
    );
    const r = rows[0] as
      | { access_token_enc: string; refresh_token_enc: string; access_expires_at: Date; refresh_expires_at: Date; account: string }
      | undefined;
    if (!r) return null;
    const token: AeToken = {
      accessToken: this.vault.decrypt(r.access_token_enc, `${this.adapterId}:access`),
      refreshToken: this.vault.decrypt(r.refresh_token_enc, `${this.adapterId}:refresh`),
      accessExpiresAt: r.access_expires_at,
      refreshExpiresAt: r.refresh_expires_at,
      account: r.account,
    };
    // Lazily re-encrypt rows sealed with a retired key.
    if (this.vault.needsRotation(r.access_token_enc) || this.vault.needsRotation(r.refresh_token_enc)) await this.save(token);
    return token;
  }

  async save(t: AeToken): Promise<void> {
    await this.db.query(
      `INSERT INTO supplier_credentials (adapter_id, access_token_enc, refresh_token_enc, access_expires_at, refresh_expires_at, account, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (adapter_id) DO UPDATE SET access_token_enc = EXCLUDED.access_token_enc, refresh_token_enc = EXCLUDED.refresh_token_enc,
         access_expires_at = EXCLUDED.access_expires_at, refresh_expires_at = EXCLUDED.refresh_expires_at, account = EXCLUDED.account, updated_at = now()`,
      [
        this.adapterId,
        this.vault.encrypt(t.accessToken, `${this.adapterId}:access`),
        this.vault.encrypt(t.refreshToken, `${this.adapterId}:refresh`),
        t.accessExpiresAt,
        t.refreshExpiresAt,
        t.account,
      ],
    );
  }
}

interface LinkRow {
  variant_id: string;
  price_cents: number;
  availability: Availability;
  link_id: string | null;
  adapter_id: string | null;
  external_id: string | null;
  external_sku: string | null;
  priority: number | null;
  shipping_cents: number | null;
  cost_cents: number | null;
  stock: number | null;
  synced_at: Date | null;
}

export class PgSyncRepo implements SyncRepo {
  constructor(private readonly db: Db) {}

  async listPublishedVariants(): Promise<SyncVariant[]> {
    const { rows } = await this.db.query<LinkRow>(
      `SELECT v.variant_id, v.price_cents, v.availability, l.id::text AS link_id, l.adapter_id, l.external_id, l.external_sku,
              l.priority, l.shipping_cents, l.cost_cents, l.stock, l.synced_at
         FROM catalog_variants v LEFT JOIN supplier_links l ON l.variant_id = v.variant_id
        WHERE v.published ORDER BY v.variant_id, l.priority`,
    );
    const out = new Map<string, SyncVariant>();
    for (const r of rows) {
      let v = out.get(r.variant_id);
      if (!v) {
        v = { variantId: r.variant_id, priceCents: r.price_cents, availability: r.availability, links: [] };
        out.set(r.variant_id, v);
      }
      if (r.link_id) {
        v.links.push({
          linkId: r.link_id,
          adapterId: r.adapter_id!,
          externalId: r.external_id!,
          externalSkuId: r.external_sku!,
          priority: r.priority!,
          shippingCents: r.shipping_cents!,
          costCents: r.cost_cents!,
          stock: r.stock!,
          syncedAt: r.synced_at,
        });
      }
    }
    return [...out.values()];
  }

  async updateLink(linkId: string, u: { costCents: number; stock: number; available: boolean; syncedAt: Date }): Promise<void> {
    await this.db.query(`UPDATE supplier_links SET cost_cents = $2, stock = $3, available = $4, synced_at = $5 WHERE id = $1`, [
      linkId,
      u.costCents,
      u.stock,
      u.available,
      u.syncedAt,
    ]);
  }

  async setAvailability(variantId: string, availability: Availability, activeLinkId: string | null): Promise<void> {
    await this.db.query(`UPDATE catalog_variants SET availability = $2, active_link_id = $3 WHERE variant_id = $1`, [variantId, availability, activeLinkId]);
  }
}

interface OrderRow {
  id: string;
  order_id: string;
  adapter_id: string;
  state: SupplierOrderRow["state"];
  attempts: number;
  request: SupplierOrderRequest;
  ref: SupplierOrderRef | null;
  last_error: string | null;
}

export class PgForwardingRepo implements ForwardingRepo {
  constructor(private readonly db: Db) {}

  async get(id: string): Promise<SupplierOrderRow | null> {
    const { rows } = await this.db.query<OrderRow>(`SELECT id, order_id, adapter_id, state, attempts, request, ref, last_error FROM supplier_orders WHERE id = $1`, [id]);
    const r = rows[0];
    return r ? { id: r.id, orderId: r.order_id, adapterId: r.adapter_id, state: r.state, attempts: r.attempts, request: r.request, ref: r.ref, lastError: r.last_error } : null;
  }

  /** Compare-and-set: only one worker can move a row into "placing". */
  async claim(id: string): Promise<boolean> {
    const { rowCount } = await this.db.query(
      `UPDATE supplier_orders SET state = 'placing', attempts = attempts + 1, updated_at = now() WHERE id = $1 AND state IN ('pending', 'retry')`,
      [id],
    );
    return rowCount === 1;
  }

  async markPlaced(id: string, ref: SupplierOrderRef): Promise<void> {
    await this.db.query(`UPDATE supplier_orders SET state = 'placed', ref = $2, last_error = NULL, updated_at = now() WHERE id = $1`, [id, JSON.stringify(ref)]);
  }
  async markRetry(id: string, error: string): Promise<void> {
    await this.db.query(`UPDATE supplier_orders SET state = 'retry', last_error = $2, updated_at = now() WHERE id = $1`, [id, error.slice(0, 2000)]);
  }
  async markNeedsAttention(id: string, error: string): Promise<void> {
    await this.db.query(`UPDATE supplier_orders SET state = 'needs_attention', last_error = $2, updated_at = now() WHERE id = $1`, [id, error.slice(0, 2000)]);
  }

  async listPlacedForPolling(): Promise<Array<{ id: string; orderId: string; adapterId: string; ref: SupplierOrderRef; last: SupplierOrderStatus | null }>> {
    const { rows } = await this.db.query<{ id: string; order_id: string; adapter_id: string; ref: SupplierOrderRef; last_status: SupplierOrderStatus | null }>(
      `SELECT id, order_id, adapter_id, ref, last_status FROM supplier_orders
        WHERE state = 'placed' AND COALESCE(last_status->>'state', '') NOT IN ('delivered', 'cancelled')`,
    );
    return rows.map((r) => ({ id: r.id, orderId: r.order_id, adapterId: r.adapter_id, ref: r.ref, last: r.last_status }));
  }

  async saveStatus(id: string, status: SupplierOrderStatus): Promise<void> {
    await this.db.query(`UPDATE supplier_orders SET last_status = $2, updated_at = now() WHERE id = $1`, [id, JSON.stringify(status)]);
  }
}

export class PgAlertSink implements AlertSink {
  constructor(private readonly db: Db) {}
  async alert(a: Alert): Promise<void> {
    await this.db.query(`INSERT INTO alerts (level, code, message, ref) VALUES ($1, $2, $3, $4)`, [a.level, a.code, a.message.slice(0, 2000), a.ref ?? null]);
    if (a.level === "critical") console.error(`[alert] ${a.code} ${a.ref ?? ""}`);
  }
}
