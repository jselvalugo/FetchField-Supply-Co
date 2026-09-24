import type { Metadata } from "next";
import { PageHead } from "@/components/common/PageHead";
import { Cart } from "./Cart";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };

export default function CartPage() {
  return (
    <>
      <PageHead eyebrow="FetchField Shop" title="Cart" />
      <div className="wrap section pt-10"><Cart /></div>
    </>
  );
}
