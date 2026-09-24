import type { Metadata } from "next";
import { PageHead } from "@/components/common/PageHead";
import { TrackForm } from "./TrackForm";

export const metadata: Metadata = { title: "Track an order", robots: { index: false } };

export default async function Track({ searchParams }: { searchParams: Promise<{ placed?: string }> }) {
  const { placed } = await searchParams;
  return (
    <>
      <PageHead eyebrow="FetchField Shop" title={placed ? "Thanks. Your order is in." : "Track an order"}
        lede={placed ? <p className="m-0">We've emailed your receipt. When it ships you'll get a tracking link that opens this page.</p> : <p className="m-0">Enter your order number and the ZIP it's shipping to.</p>} />
      <div className="wrap section pt-10"><TrackForm /></div>
    </>
  );
}
