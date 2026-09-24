import type { Metadata } from "next";
import { ProsePage } from "@/components/common/ProsePage";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <ProsePage eyebrow="Legal" title="Privacy" updated="2026-09-24" draft>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Orders:</strong> name, email, phone, shipping address. Payment details go directly to Stripe and never reach our servers.</li>
        <li><strong>Quote requests:</strong> your organization, contact details and what you asked us to quote.</li>
        <li><strong>In your browser only:</strong> your cart, quote list, last-used ZIP and whether you last visited Pro or Shop. These stay in your browser and aren't sent to us until you check out or submit.</li>
      </ul>
      <h2>Who we share it with</h2>
      <p>To deliver an order we share the shipping name, address and phone number with the warehouse or maker that ships your item, and with the carrier. We don't sell personal information or share it for advertising.</p>
      <h2>Cookies</h2>
      <p>We set one first-party cookie that remembers whether you last used Pro or Shop. We don't run advertising or cross-site tracking cookies.</p>
      <h2>Your rights (including California residents)</h2>
      <p>You can ask to see, correct or delete your information by emailing <a href={`mailto:${site.helpEmail}`}>{site.helpEmail}</a>. We respond within 45 days, as the CCPA requires, and won't treat you differently for asking.</p>
    </ProsePage>
  );
}
