import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { PageHead } from "@/components/common/PageHead";
import { QuoteBuilder } from "./QuoteBuilder";

export const metadata: Metadata = { title: "Quote list", robots: { index: false } };

export default function QuotePage() {
  return (
    <>
      <div className="wrap"><Breadcrumbs items={[{ label: "Pro", href: "/pro" }, { label: "Quote list" }]} /></div>
      <PageHead eyebrow="FetchField Pro" title="Quote list" lede={<p className="m-0">Adjust quantities, add notes, and tell us where it's going. You'll get a reference number now and a final quote within one business day.</p>} />
      <div className="wrap section pt-10">
        <QuoteBuilder />
      </div>
    </>
  );
}
