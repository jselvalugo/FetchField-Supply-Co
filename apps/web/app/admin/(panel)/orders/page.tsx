import Link from "next/link";
import { listOrders } from "@/lib/server/data";
import { usd } from "@/lib/format";
import { OrderBadge, when } from "@/components/admin/Badges";

export const metadata = { title: "Orders" };

export default async function Orders({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s = "open" } = await searchParams;
  const all = await listOrders();
  const rows = all.filter((o) => (s === "open" ? o.status === "paid" || o.status === "processing" : s === "all" ? true : o.status === s));
  const tabs = [["open", "To ship"], ["shipped", "Shipped"], ["delivered", "Delivered"], ["all", "All"]] as const;
  return (
    <>
      <header className="adm-head"><div><p className="eyebrow m-0">FetchField Shop</p><h1 className="display display--wide">Orders</h1></div></header>
      <nav aria-label="Order status" className="mb-4 flex flex-wrap gap-2">
        {tabs.map(([k, l]) => (
          <Link key={k} href={`/admin/orders?s=${k}`} aria-current={s === k ? "page" : undefined}
            className={`ff-btn ff-btn--sm ${s === k ? "ff-btn--secondary !bg-text !text-bg" : "ff-btn--secondary"}`}>{l}</Link>
        ))}
      </nav>
      <div className="adm-panel adm-scroll">
        {rows.length ? (
          <table className="adm-table">
            <thead><tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Status</th><th scope="col" className="num">Total</th><th scope="col">Placed</th></tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/admin/orders/${o.id}`} className="mono">{o.id}</Link><div className="text-xs text-muted">{o.items.reduce((n, i) => n + i.qty, 0)} items</div></td>
                  <td>{o.shipTo?.name || o.email}<div className="text-xs text-muted">{o.shipTo ? `${o.shipTo.city}, ${o.shipTo.state} ${o.shipTo.zip}` : ""}</div></td>
                  <td><OrderBadge s={o.status} /></td>
                  <td className="num">{usd(o.totalCents)}</td>
                  <td className="whitespace-nowrap text-muted">{when(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="adm-empty m-0">
            {all.length ? "No orders with this status." : <>No orders yet. Orders are recorded automatically when Stripe confirms payment. See <Link href="/admin/settings" className="link">Settings</Link> to connect Stripe.</>}
          </p>
        )}
      </div>
    </>
  );
}
