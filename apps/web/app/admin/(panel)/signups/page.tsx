import Link from "next/link";
import { listSignups } from "@/lib/server/data";
import { removeSignup } from "@/lib/actions/admin";
import { AUDIENCE, when } from "@/components/admin/Badges";

export const metadata = { title: "Launch list" };

export default async function Signups({ searchParams }: { searchParams: Promise<{ q?: string; a?: string }> }) {
  const { q = "", a = "" } = await searchParams;
  const all = await listSignups();
  const rows = all.filter((s) => (!a || s.audience === a) && (!q || s.email.includes(q.toLowerCase())));
  return (
    <>
      <header className="adm-head">
        <div><p className="eyebrow m-0">Coming Soon page</p><h1 className="display display--wide">Launch list</h1></div>
        <Link href={`/admin/signups/export${a ? `?a=${a}` : ""}`} className="ff-btn ff-btn--action ff-btn--sm" prefetch={false}>Export CSV</Link>
      </header>
      <form className="adm-toolbar" role="search">
        <div className="field"><label htmlFor="q">Search email</label><input id="q" name="q" defaultValue={q} className="input !min-h-10 !py-1.5" /></div>
        <div className="field">
          <label htmlFor="a">Interested in</label>
          <select id="a" name="a" defaultValue={a} className="select !min-h-10 !py-1.5">
            <option value="">Everyone</option><option value="parks">Parks &amp; properties</option><option value="dog">Dog owners</option><option value="both">Both</option>
          </select>
        </div>
        <button type="submit" className="ff-btn ff-btn--secondary ff-btn--sm">Filter</button>
        <p className="m-0 ml-auto text-sm text-muted"><span className="mono">{rows.length}</span> of {all.length}</p>
      </form>
      <div className="adm-panel adm-scroll">
        {rows.length ? (
          <table className="adm-table">
            <thead><tr><th scope="col">Email</th><th scope="col">Interested in</th><th scope="col">Joined</th><th scope="col"><span className="ff-sr">Actions</span></th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td><a href={`mailto:${s.email}`}>{s.email}</a></td>
                  <td>{AUDIENCE[s.audience]}</td>
                  <td className="whitespace-nowrap text-muted">{when(s.createdAt)}</td>
                  <td className="text-right">
                    <form action={removeSignup}>
                      <input type="hidden" name="id" value={s.id} />
                      <button type="submit" className="ff-btn ff-btn--quiet ff-btn--sm">Remove<span className="ff-sr"> {s.email}</span></button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="adm-empty m-0">{all.length ? "No signups match that filter." : "No signups yet. When the Coming Soon page is live, new signups appear here."}</p>
        )}
      </div>
      <p className="mt-3 text-xs text-muted">Removing a signup deletes it permanently. Do this when someone asks to be taken off the list.</p>
    </>
  );
}
