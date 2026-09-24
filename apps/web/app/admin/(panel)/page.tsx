import Link from "next/link";
import { baseCatalog } from "@/lib/catalog";
import { getOverrides, listOrders, listQuotes, listSignups } from "@/lib/server/data";
import { usd } from "@/lib/format";
import { SignupChart } from "@/components/admin/SignupChart";
import { AUDIENCE, OrderBadge, QuoteBadge, when } from "@/components/admin/Badges";

export const metadata = { title: "Dashboard" };

const DAY = 86_400_000;
const compact = (n: number) => new Intl.NumberFormat("en-US", { notation: n >= 10_000 ? "compact" : "standard" }).format(n);

export default async function Dashboard() {
  const [signups, quotes, orders, overrides] = await Promise.all([listSignups(), listQuotes(), listOrders(), getOverrides()]);
  const now = Date.now();
  const inRange = (iso: string, from: number, to: number) => { const t = Date.parse(iso); return t >= now - from && t < now - to; };
  const s7 = signups.filter((s) => inRange(s.createdAt, 7 * DAY, 0)).length;
  const sPrev = signups.filter((s) => inRange(s.createdAt, 14 * DAY, 7 * DAY)).length;
  const paid30 = orders.filter((o) => inRange(o.createdAt, 30 * DAY, 0) && o.status !== "cancelled" && o.status !== "refunded");
  const revenue30 = paid30.reduce((s, o) => s + o.totalCents, 0);
  const openQuotes = quotes.filter((q) => q.status === "new" || q.status === "reviewing");
  const toShip = orders.filter((o) => o.status === "paid" || o.status === "processing");
  const { pro, shop } = baseCatalog();
  const hidden = Object.values(overrides.pro).filter((o) => o.hidden).length + Object.values(overrides.shop).filter((o) => o.hidden).length;
  const soldOutVariants =
    shop.flatMap((p) => p.variants.filter((v) => (overrides.shop[p.slug]?.soldOut ? overrides.shop[p.slug]!.soldOut!.includes(v.sku) : v.availability === "sold_out"))).length;

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now - (13 - i) * DAY);
    const key = d.toISOString().slice(0, 10);
    return { date: key, label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), count: signups.filter((s) => s.createdAt.slice(0, 10) === key).length };
  });
  const byAudience = (["parks", "dog", "both"] as const).map((a) => [a, signups.filter((s) => s.audience === a).length] as const);
  const staleQuotes = openQuotes.filter((q) => now - Date.parse(q.createdAt) > DAY);

  return (
    <>
      <header className="adm-head">
        <div>
          <p className="eyebrow m-0">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="display display--wide">Dashboard</h1>
        </div>
        <Link href="/admin/signups/export" className="ff-btn ff-btn--secondary ff-btn--sm" prefetch={false}>Export launch list (CSV)</Link>
      </header>

      <section aria-label="Key numbers" className="adm-tiles mb-6">
        <Link href="/admin/signups" className="adm-tile">
          <span className="adm-tile__label">Launch-list signups</span>
          <span className="adm-tile__value">{compact(signups.length)}</span>
          <span className="adm-tile__delta"><b>{s7 >= sPrev ? "+" : ""}{s7}</b> this week · {sPrev} the week before</span>
        </Link>
        <Link href="/admin/quotes" className="adm-tile">
          <span className="adm-tile__label">Open quotes</span>
          <span className="adm-tile__value">{openQuotes.length}</span>
          <span className="adm-tile__delta">{staleQuotes.length ? <><b>{staleQuotes.length}</b> waiting over 1 business day</> : "All answered on time"}</span>
        </Link>
        <Link href="/admin/orders" className="adm-tile">
          <span className="adm-tile__label">Orders to ship</span>
          <span className="adm-tile__value">{toShip.length}</span>
          <span className="adm-tile__delta"><b>{paid30.length}</b> paid in the last 30 days</span>
        </Link>
        <Link href="/admin/orders" className="adm-tile">
          <span className="adm-tile__label">Revenue, last 30 days</span>
          <span className="adm-tile__value">{usd(revenue30, { cents: false })}</span>
          <span className="adm-tile__delta">Shop orders, incl. shipping and tax</span>
        </Link>
        <Link href="/admin/products" className="adm-tile">
          <span className="adm-tile__label">Products live</span>
          <span className="adm-tile__value">{pro.length + shop.length - hidden}</span>
          <span className="adm-tile__delta"><b>{hidden}</b> hidden · <b>{soldOutVariants}</b> variants sold out</span>
        </Link>
      </section>

      <div className="adm-grid-2">
        <section className="adm-panel" aria-labelledby="chart-h">
          <div className="adm-panel__h">
            <h2 id="chart-h">Signups per day</h2>
            <span className="text-sm text-muted">Last 14 days</span>
          </div>
          <div className="adm-panel__b">
            {signups.length ? <SignupChart days={days} /> : <p className="adm-empty m-0">No signups yet. They appear here as soon as someone joins from the Coming Soon page.</p>}
          </div>
        </section>
        <section className="adm-panel" aria-labelledby="aud-h">
          <div className="adm-panel__h"><h2 id="aud-h">Who's signing up</h2></div>
          <table className="adm-table">
            <tbody>
              {byAudience.map(([a, n]) => (
                <tr key={a}><th scope="row" className="font-normal">{AUDIENCE[a]}</th><td className="num">{n}</td><td className="num text-muted">{signups.length ? Math.round((n / signups.length) * 100) : 0}%</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="adm-panel" aria-labelledby="rq-h">
          <div className="adm-panel__h"><h2 id="rq-h">Latest quote requests</h2><Link href="/admin/quotes" className="link text-sm">All quotes</Link></div>
          {quotes.length ? (
            <div className="adm-scroll">
              <table className="adm-table">
                <tbody>
                  {quotes.slice(0, 6).map((q) => (
                    <tr key={q.ref}>
                      <td><Link href={`/admin/quotes/${q.ref}`}>{q.org.name}</Link><div className="text-xs text-muted">{q.org.type} · {q.lines.length} items · ZIP {q.zip}</div></td>
                      <td><QuoteBadge s={q.status} /></td>
                      <td className="num">{usd(q.subtotalCents)}</td>
                      <td className="text-xs text-muted">{when(q.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="adm-empty m-0">No quote requests yet. They arrive from the Pro quote list.</p>}
        </section>

        <section className="adm-panel" aria-labelledby="rs-h">
          <div className="adm-panel__h"><h2 id="rs-h">Newest signups</h2><Link href="/admin/signups" className="link text-sm">All signups</Link></div>
          {signups.length ? (
            <table className="adm-table">
              <tbody>
                {signups.slice(0, 6).map((s) => (
                  <tr key={s.id}><td className="[overflow-wrap:anywhere]">{s.email}<div className="text-xs text-muted">{AUDIENCE[s.audience]}</div></td><td className="text-xs text-muted whitespace-nowrap text-right">{when(s.createdAt)}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <p className="adm-empty m-0">Nobody yet. Share the site link to start the list.</p>}
        </section>

        <section className="adm-panel" aria-labelledby="ro-h">
          <div className="adm-panel__h"><h2 id="ro-h">Orders to ship</h2><Link href="/admin/orders" className="link text-sm">All orders</Link></div>
          {toShip.length ? (
            <table className="adm-table">
              <tbody>
                {toShip.slice(0, 6).map((o) => (
                  <tr key={o.id}><td><Link href={`/admin/orders/${o.id}`}>{o.id}</Link><div className="text-xs text-muted">{o.shipTo?.name} · {o.items.length} items</div></td><td><OrderBadge s={o.status} /></td><td className="num">{usd(o.totalCents)}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <p className="adm-empty m-0">Nothing waiting. Paid orders show up here once Stripe is connected.</p>}
        </section>
      </div>
    </>
  );
}
