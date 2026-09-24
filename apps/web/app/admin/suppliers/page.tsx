import { TrailMarker, cx } from "@fetchfield/ui";
import { suggestPrice } from "@fetchfield/suppliers/pricing";
import { usd } from "@/lib/format";
import { PricingCalculator } from "./PricingCalculator";

/*
 * Supplier management (spec §8.3–8.5). The queue, runs and alerts below are
 * SAMPLE rows showing the workflow; in production they come from the
 * supplier_products, sync_runs and alerts tables written by apps/worker.
 * This page is internal and gated by proxy.ts. Customer pages never see this data.
 */

type Check = "ok" | "todo" | "fail";
const staged: Array<{
  title: string; ext: string; supplier: string; costCents: number; shipCents: number; days: string;
  checks: { rating: Check; sample: Check; materials: Check; sizing: Check; shipTime: Check; copy: Check; media: Check };
}> = [
  { title: "Reflective nylon leash 5ft padded handle", ext: "1005006123456789", supplier: "aliexpress", costCents: 642, shipCents: 0, days: "8–12",
    checks: { rating: "ok", sample: "ok", materials: "ok", sizing: "ok", shipTime: "ok", copy: "ok", media: "todo" } },
  { title: "Silicone collapsible bowl 750ml with carabiner", ext: "1005005987654321", supplier: "aliexpress", costCents: 188, shipCents: 0, days: "7–11",
    checks: { rating: "ok", sample: "todo", materials: "todo", sizing: "todo", shipTime: "ok", copy: "todo", media: "todo" } },
  { title: "No-pull dog harness adjustable reflective", ext: "1005004555501234", supplier: "aliexpress", costCents: 915, shipCents: 250, days: "14–21",
    checks: { rating: "ok", sample: "ok", materials: "fail", sizing: "ok", shipTime: "fail", copy: "todo", media: "todo" } },
  { title: "Steel waste bin, 10 gal", ext: "BIN-60", supplier: "csv-acme", costCents: 8450, shipCents: 1200, days: "3–6",
    checks: { rating: "ok", sample: "ok", materials: "ok", sizing: "ok", shipTime: "ok", copy: "todo", media: "todo" } },
];

const labels: Record<keyof (typeof staged)[number]["checks"], string> = {
  rating: "Supplier rating", sample: "Sample tested", materials: "Materials verified", sizing: "Sizing measured",
  shipTime: "Ships ≤ 12 days", copy: "Copy rewritten", media: "Images re-hosted",
};

const runs = [
  { at: "Today 12:00", kind: "Stock & price", checked: 38, changed: 3, soldOut: 1, hidden: 0, result: "ok" },
  { at: "Today 06:00", kind: "Stock & price", checked: 38, changed: 1, soldOut: 0, hidden: 1, result: "ok" },
  { at: "Today 04:00", kind: "Order tracking", checked: 12, changed: 4, soldOut: 0, hidden: 0, result: "ok" },
  { at: "Yesterday 18:00", kind: "Stock & price", checked: 38, changed: 0, soldOut: 0, hidden: 0, result: "partial: 1 supplier timed out" },
];

const alerts = [
  { level: "warn", code: "margin_below_floor", msg: "Field Harness M/Moss hidden: margin 27.4% is under the 30% floor. Reprice or switch supplier." },
  { level: "critical", code: "order_needs_attention", msg: "FF-10057: outcome unknown after timeout. Search supplier orders for memo \"FF FF-10057-aliexpress\" before retrying." },
  { level: "info", code: "sold_out", msg: "Washable Crate Mat XL/Slate sold out at every linked supplier." },
];

function Status({ v }: { v: Check }) {
  const t = { ok: "Done", todo: "To do", fail: "Failed" }[v];
  return (
    <span className={cx("inline-flex items-center gap-1 mono text-xs", v === "fail" && "text-danger font-semibold", v === "todo" && "text-muted")}>
      <span aria-hidden>{v === "ok" ? "■" : v === "fail" ? "✕" : "□"}</span>{t}
    </span>
  );
}

export default function SupplierAdmin() {
  const configured = Boolean(process.env.AE_APP_KEY && process.env.AE_APP_SECRET && process.env.SUPPLIER_TOKEN_KEYS);
  return (
    <div className="wrap grid gap-10 py-10 [&>*]:min-w-0">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-text pb-4">
        <div>
          <p className="eyebrow m-0">Admin</p>
          <h1 className="display display--wide m-0 text-4xl">Suppliers</h1>
        </div>
        <p className="m-0 border-2 border-text px-3 py-1 mono text-xs uppercase tracking-[.14em]">Sample rows: workflow preview</p>
      </header>

      <section className="grid gap-6 lg:grid-cols-3" aria-label="Connections">
        <div className="grid gap-3 border-2 border-text bg-surface p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="m-0 text-lg font-semibold">AliExpress DS API</h2>
            <span className={cx("mono text-xs uppercase tracking-[.14em]", configured ? "text-ok" : "text-danger")}>{configured ? "Configured" : "Not configured"}</span>
          </div>
          <ul className="m-0 grid gap-1.5 p-0 text-sm" style={{ listStyle: "none" }}>
            <li>App key &amp; secret: <strong>{process.env.AE_APP_KEY ? "set on server" : "missing"}</strong>. Stored only in the worker's secret store, never sent to browsers.</li>
            <li>OAuth token: encrypted at rest (AES-256-GCM, rotating keys). Refreshed automatically 24h before expiry.</li>
            <li>Every request: HMAC-SHA256 signed, HTTPS to an allowlisted host only, rate-limited, response schema-checked.</li>
            <li>Orders: never auto-retried when the outcome is unknown, so a timeout can't cause a duplicate order.</li>
          </ul>
          {!configured && <p className="m-0 text-sm text-muted">Set AE_APP_KEY, AE_APP_SECRET, AE_REDIRECT_URI and SUPPLIER_TOKEN_KEYS on the worker, then connect the account. See docs/supplier-integration.md.</p>}
        </div>
        <div className="grid content-start gap-3 border-2 border-text bg-surface p-5">
          <h2 className="m-0 text-lg font-semibold">Direct manufacturers</h2>
          <p className="m-0 text-sm">CSV price and stock sheets for wholesale deals. A sheet with any invalid row is rejected in full.</p>
          <p className="m-0 mono text-xs text-muted">csv-acme · 1 sheet · 14 SKUs</p>
        </div>
      </section>

      <section aria-labelledby="alerts">
        <h2 id="alerts" className="m-0 mb-3 text-xl font-semibold">Alerts</h2>
        <ul className="m-0 grid gap-2 p-0" style={{ listStyle: "none" }}>
          {alerts.map((a) => (
            <li key={a.code} className={cx("flex gap-3 border-l-4 bg-surface p-3 text-sm", a.level === "critical" ? "border-danger" : a.level === "warn" ? "border-accent" : "border-line-strong")}>
              <span className="mono w-40 shrink-0 text-xs uppercase text-muted">{a.code.replace(/_/g, " ")}</span>
              <span>{a.msg}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="queue" className="min-w-0">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 id="queue" className="m-0 text-xl font-semibold">Import queue: vet, rewrite, price, publish</h2>
          <p className="m-0 text-sm text-muted">Nothing publishes until every check passes.</p>
        </div>
        <div className="overflow-x-auto border-2 border-text bg-surface">
          <table className="catalog-table min-w-[64rem]">
            <thead>
              <tr>
                <th scope="col" className="!pl-4">Staged product</th>
                {Object.values(labels).map((l) => <th key={l} scope="col">{l}</th>)}
                <th scope="col" className="num">Cost</th>
                <th scope="col" className="num !pr-4">Suggested</th>
              </tr>
            </thead>
            <tbody>
              {staged.map((s) => {
                const p = suggestPrice({ costCents: s.costCents, shippingCents: s.shipCents });
                const ready = Object.values(s.checks).every((c) => c === "ok");
                return (
                  <tr key={s.ext}>
                    <td className="!pl-4">
                      <span className="font-semibold">{s.title}</span>
                      <span className="mono block text-xs text-muted">{s.supplier} · {s.ext} · {s.days} days</span>
                      <span className={cx("mono mt-1 inline-block text-xs", ready ? "text-ok" : "text-muted")}>{ready ? "Ready to publish" : "In review"}</span>
                    </td>
                    {(Object.keys(labels) as Array<keyof typeof labels>).map((k) => <td key={k}><Status v={s.checks[k]} /></td>)}
                    <td className="num">{usd(s.costCents + s.shipCents)}</td>
                    <td className="num !pr-4">{usd(p.priceCents)}<span className="block text-xs text-muted">{(p.margin * 100).toFixed(0)}% margin</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="calc">
          <h2 id="calc" className="m-0 mb-3 text-xl font-semibold">Pricing check</h2>
          <PricingCalculator />
        </section>
        <section aria-labelledby="runs">
          <h2 id="runs" className="m-0 mb-3 text-xl font-semibold">Sync runs</h2>
          <table className="catalog-table">
            <thead><tr><th scope="col">When</th><th scope="col">Job</th><th scope="col" className="num">Changed</th><th scope="col">Result</th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.at + r.kind}>
                  <td className="mono text-sm">{r.at}</td>
                  <td className="text-sm">{r.kind}<span className="block text-xs text-muted">{r.checked} checked · {r.soldOut} sold out · {r.hidden} hidden</span></td>
                  <td className="num" data-label="Changed">{r.changed}</td>
                  <td className={cx("text-sm", r.result !== "ok" && "text-danger")}>{r.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 flex items-center gap-2 text-sm text-muted"><TrailMarker shape="diamond" size={10} tone="ink" /> Stock &amp; price every 6h and before checkout · tracking every 4h · stale-data alert after 24h</p>
        </section>
      </div>
    </div>
  );
}
