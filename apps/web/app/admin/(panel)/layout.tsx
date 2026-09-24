import Link from "next/link";
import { Logo } from "@fetchfield/ui";
import { AdminNav } from "@/components/admin/AdminNav";
import { listOrders, listQuotes } from "@/lib/server/data";
import { requireAdmin } from "@/lib/server/require-admin";
import { site } from "@/lib/site";

export default async function Panel({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [quotes, orders] = await Promise.all([listQuotes(), listOrders()]);
  const newQuotes = quotes.filter((q) => q.status === "new").length;
  const toShip = orders.filter((o) => o.status === "paid" || o.status === "processing").length;
  return (
    <div className="adm">
      <aside className="adm-side turf on-dark">
        <Link href="/admin" aria-label="Admin dashboard"><Logo inverse compact /></Link>
        <AdminNav
          items={[
            { href: "/admin", label: "Dashboard" },
            { href: "/admin/orders", label: "Orders", count: toShip },
            { href: "/admin/quotes", label: "Quotes", count: newQuotes },
            { href: "/admin/signups", label: "Launch list" },
            { href: "/admin/products", label: "Products" },
            { href: "/admin/suppliers", label: "Suppliers" },
            { href: "/admin/settings", label: "Settings" },
          ]}
        />
        <div className="adm-side__foot">
          <p className="m-0 text-muted">{site.comingSoon ? "Public site: Coming Soon page" : "Public site: live"}</p>
          <Link href="/" className="link">View site</Link>
          <form method="post" action="/admin/logout"><button type="submit" className="ff-btn ff-btn--inverse ff-btn--sm w-full">Sign out</button></form>
        </div>
      </aside>
      <main id="main" className="adm-main">{children}</main>
    </div>
  );
}
