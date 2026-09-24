import type { Metadata } from "next";
import { PageHead } from "@/components/common/PageHead";
import { Checkout } from "./Checkout";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <>
      <PageHead eyebrow="FetchField Shop" title="Checkout" />
      <div className="wrap section pt-10"><Checkout /></div>
    </>
  );
}
