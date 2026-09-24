import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/lib/server/data";
import { updateOrder } from "@/lib/actions/admin";
import { usd } from "@/lib/format";
import { OrderBadge, when } from "@/components/admin/Badges";

export const metadata = { title: "Order" };

export default async function OrderDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const o = await getOrder(id);
  if (!o) notFound();
  return (
    <>
      <header className="adm-head">
        <div><p className="eyebrow m-0"><Link href="/admin/orders" className="link">Orders</Link> / {o.id}</p><h1 className="display display--wide">{o.shipTo?.name || o.email}</h1></div>
        <OrderBadge s={o.status} />
      </header>
      {saved && <p className="adm-flash" role="status">Saved. The customer's tracking page shows the new status.</p>}
      <div className="adm-grid-2">
        <div className="grid gap-6">
          <section className="adm-panel" aria-labelledby="items-h">
            <div className="adm-panel__h"><h2 id="items-h">Items</h2></div>
            <table className="adm-table">
              <thead><tr><th scope="col">Item</th><th scope="col" className="num">Qty</th><th scope="col" className="num">Total</th></tr></thead>
              <tbody>
                {o.items.map((i) => <tr key={i.sku + i.name}><td>{i.name}<div className="mono text-xs text-muted">{i.sku}</div></td><td className="num">{i.qty}</td><td className="num">{usd(i.unitCents * i.qty)}</td></tr>)}
                <tr><td colSpan={2} className="text-right text-muted">Shipping</td><td className="num">{usd(o.shippingCents)}</td></tr>
                <tr><td colSpan={2} className="text-right text-muted">Tax</td><td className="num">{usd(o.taxCents)}</td></tr>
                <tr><th scope="row" colSpan={2} className="text-right">Total paid</th><td className="num font-semibold">{usd(o.totalCents)}</td></tr>
              </tbody>
            </table>
          </section>
          <section className="adm-panel" aria-labelledby="ship-h">
            <div className="adm-panel__h"><h2 id="ship-h">Customer</h2></div>
            <dl className="adm-kv adm-panel__b">
              <dt>Email</dt><dd><a className="link" href={`mailto:${o.email}`}>{o.email}</a></dd>
              <dt>Ship to</dt><dd>{o.shipTo ? <>{o.shipTo.name}<br />{o.shipTo.line1}{o.shipTo.line2 && <>, {o.shipTo.line2}</>}<br />{o.shipTo.city}, {o.shipTo.state} {o.shipTo.zip}</> : "Not collected"}</dd>
              <dt>Stripe session</dt><dd className="mono text-xs break-all">{o.stripeSessionId}</dd>
            </dl>
          </section>
        </div>
        <div className="grid gap-6">
          <form action={updateOrder} className="adm-panel">
            <div className="adm-panel__h"><h2>Fulfilment</h2></div>
            <div className="adm-panel__b grid gap-4">
              <input type="hidden" name="id" value={o.id} />
              <div className="field">
                <label htmlFor="status">Status</label>
                <select id="status" name="status" defaultValue={o.status} className="select">
                  <option value="paid">Paid, not yet sent to supplier</option><option value="processing">Processing</option><option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option><option value="cancelled">Cancelled</option><option value="refunded">Refunded</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field"><label htmlFor="carrier">Carrier</label><input id="carrier" name="carrier" defaultValue={o.tracking?.carrier} className="input" placeholder="USPS" /></div>
                <div className="field"><label htmlFor="number">Tracking number</label><input id="number" name="number" defaultValue={o.tracking?.number} className="input mono" /></div>
              </div>
              <div className="field"><label htmlFor="note">Internal note</label><textarea id="note" name="internalNote" defaultValue={o.internalNote} className="textarea" maxLength={4000} /></div>
              <button type="submit" className="ff-btn ff-btn--action ff-btn--md">Save</button>
              <p className="m-0 text-xs text-muted">Refunds are issued in the Stripe dashboard. Mark the order Refunded here afterwards.</p>
            </div>
          </form>
          <section className="adm-panel" aria-labelledby="oh-h">
            <div className="adm-panel__h"><h2 id="oh-h">History</h2></div>
            <ol className="timeline adm-panel__b m-0">
              {o.history.map((h, i) => <li key={i} className="is-done"><span className="timeline__dot" /><span className="timeline__t">{h.event}</span><span className="timeline__d block">{when(h.at)}</span></li>)}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
