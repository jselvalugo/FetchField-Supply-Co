import type { Metadata } from "next";
import { ProsePage } from "@/components/common/ProsePage";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Returns", description: "30-day returns on FetchField Shop orders. For most returns you won't need to ship anything back." };

export default function Returns() {
  return (
    <ProsePage eyebrow="Help" title="Returns" updated="2026-09-24" draft lede={<p className="m-0">{site.returnWindowDays} days from delivery. For most returns you won't need to ship anything back.</p>}>
      <h2>Shop orders</h2>
      <ol>
        <li>Email <a href={`mailto:${site.helpEmail}`}>{site.helpEmail}</a> with your order number and what's wrong, plus a photo if it arrived damaged or faulty.</li>
        <li>For most items we refund you without asking for the item back. Some of our stock ships from overseas, and returning it there would cost more than the item. Donate it or pass it on.</li>
        <li>For higher-value items we'll send a prepaid US return label instead. Either way you don't pay return shipping when we got something wrong.</li>
      </ol>
      <p>Refunds go to your original payment method within 5 business days of our approval.</p>
      <h3>Wrong size?</h3>
      <p>We'll send the right size and refund or credit the difference. You don't need to wait for the first one to come back.</p>
      <h2>Pro orders</h2>
      <p>Commercial equipment can be returned unused in original packaging within 30 days of delivery, less return freight. Custom items (printed signs, fencing cut to your plan) can't be returned unless they arrive damaged or wrong. Warranty terms are on each product's spec plate.</p>
    </ProsePage>
  );
}
