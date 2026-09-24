import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuote } from "@/lib/server/data";
import { updateQuote } from "@/lib/actions/admin";
import { usd } from "@/lib/format";
import { QuoteBadge, when } from "@/components/admin/Badges";

export const metadata = { title: "Quote" };

export default async function QuoteDetail({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { ref } = await params;
  const { saved } = await searchParams;
  const q = await getQuote(ref);
  if (!q) notFound();
  const mail = `mailto:${q.buyer.email}?subject=${encodeURIComponent(`Your FetchField quote ${q.ref}`)}`;
  return (
    <>
      <header className="adm-head">
        <div>
          <p className="eyebrow m-0"><Link href="/admin/quotes" className="link">Quotes</Link> / {q.ref}</p>
          <h1 className="display display--wide">{q.org.name}</h1>
        </div>
        <div className="flex items-center gap-3"><QuoteBadge s={q.status} /><a href={mail} className="ff-btn ff-btn--action ff-btn--sm">Email buyer</a></div>
      </header>
      {saved && <p className="adm-flash" role="status">Saved.</p>}
      <div className="adm-grid-2">
        <div className="grid gap-6">
          <section className="adm-panel" aria-labelledby="li-h">
            <div className="adm-panel__h"><h2 id="li-h">Items</h2><span className="text-sm text-muted">List pricing at submission</span></div>
            <div className="adm-scroll">
              <table className="adm-table">
                <thead><tr><th scope="col">Item</th><th scope="col" className="num">Qty</th><th scope="col" className="num">Unit</th><th scope="col" className="num">Line</th></tr></thead>
                <tbody>
                  {q.lines.map((l) => (
                    <tr key={l.slug}>
                      <td><Link href={`/pro/products/${l.slug}`} target="_blank">{l.name}</Link><div className="mono text-xs text-muted">{l.model} · {l.unit}</div>{l.note && <div className="text-xs">Note: {l.note}</div>}</td>
                      <td className="num">{l.qty.toLocaleString()}</td>
                      <td className="num">{l.unitCents === null ? "per site" : usd(l.unitCents)}</td>
                      <td className="num">{l.lineCents === null ? "—" : usd(l.lineCents)}</td>
                    </tr>
                  ))}
                  <tr><th scope="row" colSpan={3} className="text-right">Subtotal before freight, tax, install</th><td className="num font-semibold">{usd(q.subtotalCents)}</td></tr>
                </tbody>
              </table>
            </div>
          </section>
          <section className="adm-panel" aria-labelledby="req-h">
            <div className="adm-panel__h"><h2 id="req-h">Request details</h2></div>
            <dl className="adm-kv adm-panel__b">
              <dt>Buyer</dt><dd>{q.buyer.name}{q.buyer.role ? `, ${q.buyer.role}` : ""}<br /><a className="link" href={mail}>{q.buyer.email}</a>{q.buyer.phone && <> · {q.buyer.phone}</>}</dd>
              <dt>Organization</dt><dd>{q.org.name} ({q.org.type})</dd>
              <dt>Deliver to</dt><dd className="mono">ZIP {q.zip}</dd>
              <dt>Needed by</dt><dd>{q.neededBy || "Not given"}</dd>
              <dt>Installation</dt><dd>{q.install}</dd>
              <dt>Tax-exempt</dt><dd>{q.taxExempt === "yes" ? "Yes, certificate to follow" : "No"}</dd>
              <dt>Bid / solicitation</dt><dd className="mono">{q.bidNumber || "—"}</dd>
              <dt>Notes</dt><dd className="whitespace-pre-wrap">{q.notes || "—"}</dd>
            </dl>
          </section>
        </div>
        <div className="grid gap-6">
          <form action={updateQuote} className="adm-panel">
            <div className="adm-panel__h"><h2>Status &amp; notes</h2></div>
            <div className="adm-panel__b grid gap-4">
              <input type="hidden" name="ref" value={q.ref} />
              <div className="field">
                <label htmlFor="status">Status</label>
                <select id="status" name="status" defaultValue={q.status} className="select">
                  <option value="new">New</option><option value="reviewing">Reviewing</option><option value="sent">Final quote sent</option>
                  <option value="accepted">Accepted</option><option value="declined">Declined</option><option value="expired">Expired</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="note">Internal note <span className="hint">(never shown to the buyer)</span></label>
                <textarea id="note" name="internalNote" defaultValue={q.internalNote} className="textarea" maxLength={4000} />
              </div>
              <button type="submit" className="ff-btn ff-btn--action ff-btn--md">Save</button>
            </div>
          </form>
          <section className="adm-panel" aria-labelledby="hist-h">
            <div className="adm-panel__h"><h2 id="hist-h">History</h2><span className="mono text-xs text-muted">Expires {q.expiresAt}</span></div>
            <ol className="timeline adm-panel__b m-0">
              {q.history.map((h, i) => <li key={i} className="is-done"><span className="timeline__dot" /><span className="timeline__t">{h.event}</span><span className="timeline__d block">{when(h.at)}</span></li>)}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
