import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, buttonClass } from "@fetchfield/ui";
import { PageHead } from "@/components/common/PageHead";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Company account", robots: { index: false } };

export default function Account() {
  return (
    <>
      <PageHead eyebrow="FetchField Pro" title="Company account" />
      <div className="wrap section grid gap-10 pt-8 lg:grid-cols-2">
        <EmptyState
          title="Online accounts are on the way"
          action={<a href={`mailto:${site.quotesEmail}?subject=${encodeURIComponent("Net-30 account application")}`} className={buttonClass("action")}>Apply for an account by email</a>}
        >
          <p className="m-0">Company accounts with several users, saved lists, reorder and invoices are coming next. Until then, we set up net-30 accounts by email and your quotes arrive in your inbox.</p>
        </EmptyState>
        <div className="grid content-start gap-3 border-t-2 border-text pt-4 text-sm">
          <p className="eyebrow m-0">What accounts will include</p>
          <ul className="m-0 grid gap-1 pl-5">
            <li>Several buyers under one organization</li>
            <li>Your tax-exempt certificate on file</li>
            <li>PO checkout on net-30</li>
            <li>Saved lists, e.g. "Riverside Park refill kit"</li>
            <li>Reorder from past orders; invoices and quotes in one place</li>
          </ul>
          <Link href="/pro/quote" className="link mt-2 font-semibold">Go to your quote list</Link>
        </div>
      </div>
    </>
  );
}
