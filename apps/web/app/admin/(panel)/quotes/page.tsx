import Link from "next/link";
import { listQuotes } from "@/lib/server/data";
import { usd } from "@/lib/format";
import { QuoteBadge, when } from "@/components/admin/Badges";

export const metadata = { title: "Quotes" };

export default async function Quotes({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s = "open" } = await searchParams;
  const all = await listQuotes();
  const rows = all.filter((q) => (s === "open" ? q.status === "new" || q.status === "reviewing" : s === "all" ? true : q.status === s));
  const tabs = [["open", "Open"], ["sent", "Sent"], ["accepted", "Accepted"], ["all", "All"]] as const;
  return (
    <>
      <header className="adm-head"><div><p className="eyebrow m-0">FetchField Pro</p><h1 className="display display--wide">Quotes</h1></div></header>
      <nav aria-label="Quote status" className="mb-4 flex flex-wrap gap-2">
        {tabs.map(([k, l]) => (
          <Link key={k} href={`/admin/quotes?s=${k}`} aria-current={s === k ? "page" : undefined}
            className={`ff-btn ff-btn--sm ${s === k ? "ff-btn--secondary !bg-text !text-bg" : "ff-btn--secondary"}`}>{l}</Link>
        ))}
      </nav>
      <div className="adm-panel adm-scroll">
        {rows.length ? (
          <table className="adm-table">
            <thead><tr><th scope="col">Reference</th><th scope="col">Organization</th><th scope="col">Status</th><th scope="col" className="num">List subtotal</th><th scope="col">Received</th><th scope="col">Expires</th></tr></thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q.ref}>
                  <td><Link href={`/admin/quotes/${q.ref}`} className="mono">{q.ref}</Link></td>
                  <td>{q.org.name}<div className="text-xs text-muted">{q.org.type} · {q.buyer.name}{q.bidNumber ? ` · Bid ${q.bidNumber}` : ""}</div></td>
                  <td><QuoteBadge s={q.status} /></td>
                  <td className="num">{usd(q.subtotalCents)}</td>
                  <td className="whitespace-nowrap text-muted">{when(q.createdAt)}</td>
                  <td className="mono whitespace-nowrap text-muted">{q.expiresAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="adm-empty m-0">{all.length ? "No quotes with this status." : "No quote requests yet. Buyers submit them from the Pro quote list."}</p>}
      </div>
    </>
  );
}
