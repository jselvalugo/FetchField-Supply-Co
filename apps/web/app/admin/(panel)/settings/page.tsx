import Link from "next/link";
import { listAudit } from "@/lib/server/data";
import { site } from "@/lib/site";
import { when } from "@/components/admin/Badges";

export const metadata = { title: "Settings" };

/** Read-only health view. Secrets are only reported as set or missing, never shown. */
export default async function Settings() {
  const env = (k: string) => Boolean(process.env[k]);
  const checks: Array<{ name: string; ok: boolean; on: string; off: string; vars: string }> = [
    { name: "Coming Soon page", ok: site.comingSoon, on: "Public visitors see the Coming Soon page.", off: "The full store is public.", vars: "COMING_SOON=1" },
    { name: "Team preview password", ok: env("PREVIEW_PASSWORD"), on: "Set. Share it with people who should see the full site.", off: "Not set. Nobody can open the preview.", vars: "PREVIEW_PASSWORD" },
    { name: "Search engines", ok: site.noindex, on: "Blocked while the catalog is sample data.", off: "Allowed to index the site.", vars: "SITE_NOINDEX=1" },
    { name: "Payments (Stripe)", ok: env("STRIPE_SECRET_KEY"), on: "Checkout is on.", off: "Checkout shows \"payments are off\" and takes no orders.", vars: "STRIPE_SECRET_KEY" },
    { name: "Order recording (Stripe webhook)", ok: env("STRIPE_WEBHOOK_SECRET"), on: "Paid orders appear in Orders.", off: "Paid orders won't be recorded here.", vars: "STRIPE_WEBHOOK_SECRET · endpoint /api/stripe/webhook · event checkout.session.completed" },
    { name: "Email (Resend)", ok: env("RESEND_API_KEY") && env("EMAIL_FROM"), on: "Quote and order emails are sent.", off: "Emails are only logged, not sent.", vars: "RESEND_API_KEY, EMAIL_FROM" },
    { name: "Separate session secret", ok: env("ADMIN_SESSION_SECRET"), on: "Admin sessions use their own key.", off: "Sessions are signed with a key derived from the admin password (works, but a separate secret is better).", vars: "ADMIN_SESSION_SECRET" },
  ];
  const log = await listAudit(25);
  return (
    <>
      <header className="adm-head"><div><p className="eyebrow m-0">Site</p><h1 className="display display--wide">Settings</h1></div></header>
      <div className="adm-grid-2">
        <section className="adm-panel" aria-labelledby="h-health">
          <div className="adm-panel__h"><h2 id="h-health">Status</h2><a href="https://app.netlify.com/projects/fetchfield-supply-co/configuration/env" target="_blank" rel="noreferrer" className="link text-sm">Change in Netlify</a></div>
          <ul className="m-0 list-none p-0">
            {checks.map((c) => (
              <li key={c.name} className="grid gap-1 border-b border-line px-4 py-3">
                <span className="flex items-center justify-between gap-3"><strong>{c.name}</strong><span className={`badge ${c.ok ? "badge--ok" : "badge--muted"}`}>{c.ok ? "On" : "Off"}</span></span>
                <span className="text-sm">{c.ok ? c.on : c.off}</span>
                <span className="mono text-xs text-muted">{c.vars}</span>
              </li>
            ))}
          </ul>
          <p className="adm-panel__b m-0 text-xs text-muted">These are environment variables in Netlify (Project configuration → Environment variables). Changes apply on the next deploy.</p>
        </section>
        <section className="adm-panel" aria-labelledby="h-log">
          <div className="adm-panel__h"><h2 id="h-log">Admin activity</h2><span className="text-sm text-muted">Last 25</span></div>
          {log.length ? (
            <table className="adm-table"><tbody>{log.map((l, i) => <tr key={i}><td className="whitespace-nowrap text-xs text-muted">{when(l.at)}</td><td className="mono text-xs">{l.action}</td><td className="text-sm">{l.detail}</td></tr>)}</tbody></table>
          ) : <p className="adm-empty m-0">No activity yet.</p>}
          <p className="adm-panel__b m-0 text-sm"><Link href="/admin/suppliers" className="link">Supplier connection &amp; import queue</Link></p>
        </section>
      </div>
    </>
  );
}
