import type { Metadata } from "next";
import { ProsePage } from "@/components/common/ProsePage";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Shipping", description: "How FetchField delivery dates are calculated, shipping costs, and what happens if an order runs late." };

export default function Shipping() {
  return (
    <ProsePage eyebrow="Help" title="Shipping" updated="2026-09-24" draft>
      <h2>Shop orders</h2>
      <ul>
        <li>Free standard shipping on orders over ${site.freeShippingCents / 100}; ${(site.flatShippingCents / 100).toFixed(2)} below that.</li>
        <li>We ship to the 50 states, Puerto Rico, US territories and APO/FPO addresses. Alaska, Hawaii, territories and military addresses take 5–7 days longer.</li>
        <li>Some items ship from partner warehouses, so an order may arrive in more than one box. You'll get tracking for each.</li>
      </ul>
      <h3>How we calculate your delivery date</h3>
      <p>The dates on each product page are a range: 1–2 business days for us to process the order, plus the carrier's real transit time from where that item ships, plus extra days for remote ZIP codes. We show the whole range, not the best case.</p>
      <h3>If an order is running late</h3>
      <p>If we can't ship by the date we gave you, we'll email you <em>before</em> that date with a new date and the choice to cancel for a full, prompt refund. If you don't answer, we keep the order open for the new date. If that date slips too, we ask again. This follows the FTC Mail, Internet, or Telephone Order Merchandise Rule.</p>
      <h2>Pro orders</h2>
      <p>Commercial equipment ships LTL freight or parcel, quoted per order to your dock or site. Your quote lists lead time for each item, liftgate and residential-delivery charges, and whether we're installing. Lead times start when you accept the quote.</p>
    </ProsePage>
  );
}
