import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, TrailMarker, buttonClass } from "@fetchfield/ui";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { PageHead } from "@/components/common/PageHead";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Procurement: W-9, COI, tax-exempt and payment terms",
  description: "Everything a public-agency or HOA buyer needs to purchase from FetchField Pro: W-9, certificate of insurance, tax-exempt handling, net-30 terms and a sample quote.",
  alternates: { canonical: "/pro/procurement" },
};

const docs = [
  { code: "W-9", name: "Form W-9", detail: "Taxpayer ID for vendor setup", note: "Emailed same business day" },
  { code: "COI", name: "Certificate of insurance", detail: "General liability; we can name your agency as additional insured", note: "Issued per request, 1–2 business days" },
  { code: "ACH", name: "ACH / remittance form", detail: "Bank details on our letterhead for AP", note: "Emailed same business day" },
];

const payments = [
  ["Credit card", "Visa, Mastercard, Amex, Discover. Purchasing cards (P-cards) accepted.", "At order"],
  ["ACH bank transfer", "Via Stripe; remittance details on the invoice.", "At order"],
  ["Purchase order, net-30", "For approved accounts. Apply once; approval usually takes 3–5 business days.", "30 days from invoice"],
  ["Check", "Mailed to our remittance address, for approved net-30 accounts.", "30 days from invoice"],
] as const;

export default function Procurement() {
  const mail = (subject: string) => `mailto:${site.quotesEmail}?subject=${encodeURIComponent(subject)}`;
  return (
    <>
      <div className="wrap"><Breadcrumbs items={[{ label: "Pro", href: "/pro" }, { label: "Procurement" }]} /></div>
      <PageHead
        eyebrow="For purchasing and AP teams"
        title="Procurement"
        lede={<p className="m-0">What your purchasing office will ask for, in one place. If you need a form we don't list, email <a className="link" href={`mailto:${site.quotesEmail}`}>{site.quotesEmail}</a> and we'll fill it in.</p>}
      />

      <section className="wrap section pt-10" aria-labelledby="docs">
        <h2 id="docs" className="display display--wide m-0 mb-6 text-3xl">Vendor documents</h2>
        <ul className="downloads">
          {docs.map((d) => (
            <li key={d.code}>
              <span className="downloads__kind" aria-hidden>{d.code}</span>
              <span>
                <span className="font-semibold">{d.name}</span>
                <span className="downloads__fmt">{d.detail} · {d.note}</span>
              </span>
              <a className="link text-sm font-semibold" href={mail(`Request: ${d.name}`)}>Request<span className="ff-sr"> {d.name}</span></a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">Signed documents go out by email on request rather than as public downloads, so they stay current and carry your agency's name where needed.</p>
      </section>

      <section className="section border-t-2 border-text bg-sunken" aria-labelledby="tax">
        <div className="wrap grid gap-10 lg:grid-cols-2">
          <div>
            <h2 id="tax" className="display display--wide m-0 mb-4 text-3xl">Tax-exempt purchases</h2>
            <div className="prose">
              <ol>
                <li>Mark "Tax-exempt" when you submit a quote request.</li>
                <li>Send your exemption certificate (state form or letter) when we reply. We verify it and keep it on file.</li>
                <li>Future quotes and orders for your organization are issued without sales tax while the certificate is valid.</li>
              </ol>
              <p>We use certificates only to calculate tax on your orders, and never share them.</p>
            </div>
          </div>
          <div>
            <h2 className="display display--wide m-0 mb-4 text-3xl">Payment</h2>
            <table className="catalog-table">
              <thead><tr><th scope="col">Method</th><th scope="col" className="num">Due</th></tr></thead>
              <tbody>
                {payments.map(([m, d, due]) => (
                  <tr key={m}>
                    <td><span className="font-semibold">{m}</span><p className="catalog-row__summary">{d}</p></td>
                    <td className="num" data-label="Due">{due}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <a className={buttonClass("secondary", "md", "mt-6")} href={mail("Net-30 account application")}>Apply for net-30 terms</a>
          </div>
        </div>
      </section>

      <section className="wrap section grid gap-10 lg:grid-cols-2" aria-labelledby="coop">
        <div>
          <h2 id="coop" className="display display--wide m-0 mb-4 text-3xl">Cooperative contracts</h2>
          <EmptyState title="No cooperative contracts yet">
            <p className="m-0">We're not on a cooperative purchasing contract yet. If your agency needs one to buy, tell us which. It helps us decide which to apply for.</p>
          </EmptyState>
        </div>
        <div>
          <h2 className="display display--wide m-0 mb-4 text-3xl">Sample quote</h2>
          <p>See what our quotes include (line items, freight, tax status, lead times, terms) before you request one.</p>
          <Link href="/pro/procurement/sample-quote" className={buttonClass("secondary")}>View sample quote</Link>
          <ul className="mt-8 grid list-none gap-3 p-0 text-sm">
            {["Quotes valid 30 days", "Bid and solicitation numbers printed on every quote", "Freight quoted to your dock or site, liftgate noted", "Lead times confirmed with the manufacturer before we send"].map((t) => (
              <li key={t} className="flex items-center gap-3"><TrailMarker shape="square" size={10} /> {t}</li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
