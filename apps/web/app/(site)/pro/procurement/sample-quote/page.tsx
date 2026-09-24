import type { Metadata } from "next";
import { Logo } from "@fetchfield/ui";
import { PrintButton } from "@/components/common/PrintButton";
import { usd } from "@/lib/format";

export const metadata: Metadata = { title: "Sample quote", robots: { index: false } };

const lines = [
  { model: "FF-WS400", name: "Park Station 400", qty: 6, unit: 35900, lead: "2–3 wk" },
  { model: "FF-BH2000", name: "Header-Pack Bags, case of 2,000", qty: 8, unit: 7900, lead: "1–2 days" },
  { model: "FF-BL250", name: "Bin Liners, case of 250", qty: 2, unit: 4200, lead: "1–2 days" },
  { model: "FF-SG1824", name: "Park Rules Sign, 18 × 24 in", qty: 2, unit: 14900, lead: "7–10 days" },
];

export default function SampleQuote() {
  const sub = lines.reduce((s, l) => s + l.qty * l.unit, 0);
  const freight = 42500;
  return (
    <div className="wrap py-8">
      <div className="mb-6 flex items-center gap-3 print:hidden"><PrintButton /></div>
      <article className="relative grid gap-6 border-2 border-text bg-surface p-6 md:p-10">
        <p className="absolute right-6 top-6 m-0 -rotate-6 border-2 border-danger px-3 py-1 font-mono text-sm font-semibold tracking-[.2em] text-danger">SAMPLE</p>
        <header className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-text pb-5">
          <Logo />
          <dl className="mono m-0 grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">Quote</dt><dd className="m-0">FFQ-260915-SAMPLE</dd>
            <dt className="text-muted">Issued</dt><dd className="m-0">2026-09-15</dd>
            <dt className="text-muted">Valid until</dt><dd className="m-0">2026-10-15</dd>
            <dt className="text-muted">Solicitation</dt><dd className="m-0">RFQ 2026-114</dd>
          </dl>
        </header>
        <div className="grid gap-6 sm:grid-cols-2">
          <div><p className="eyebrow m-0">Prepared for</p><p className="m-0 mt-1">Example City Parks &amp; Recreation<br />Attn: Purchasing<br />Tax-exempt: certificate on file</p></div>
          <div><p className="eyebrow m-0">Ship to</p><p className="m-0 mt-1">Riverside Dog Park maintenance yard<br />Liftgate required · weekday 7a–3p</p></div>
        </div>
        <table className="catalog-table">
          <thead><tr><th scope="col">Item</th><th scope="col" className="num">Qty</th><th scope="col" className="num">Unit</th><th scope="col" className="num">Lead</th><th scope="col" className="num">Total</th></tr></thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.model}>
                <td><span className="font-semibold">{l.name}</span><div className="catalog-row__model">{l.model}</div></td>
                <td className="num" data-label="Qty">{l.qty}</td>
                <td className="num" data-label="Unit">{usd(l.unit)}</td>
                <td className="num" data-label="Lead">{l.lead}</td>
                <td className="num" data-label="Total">{usd(l.qty * l.unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="summary ml-auto w-full max-w-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{usd(sub)}</dd></div>
          <div className="flex justify-between"><dt>Freight, LTL with liftgate</dt><dd>{usd(freight)}</dd></div>
          <div className="flex justify-between"><dt>Sales tax (exempt)</dt><dd>{usd(0)}</dd></div>
          <div className="total flex justify-between"><dt>Total</dt><dd>{usd(sub + freight)}</dd></div>
        </dl>
        <footer className="grid gap-1 border-t border-line pt-4 text-xs text-muted">
          <p className="m-0">Terms: net 30 for approved accounts, or card/ACH on acceptance. Prices firm for 30 days. Lead times start at acceptance.</p>
          <p className="m-0">Accept online with the link in your quote email, or sign and return with a PO.</p>
        </footer>
      </article>
    </div>
  );
}
