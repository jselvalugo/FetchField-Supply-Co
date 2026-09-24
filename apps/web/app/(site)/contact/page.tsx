import type { Metadata } from "next";
import { ProsePage } from "@/components/common/ProsePage";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Contact" };

export default function Contact() {
  return (
    <ProsePage eyebrow="Company" title="Contact">
      <table>
        <tbody>
          <tr><th scope="row">Quotes &amp; commercial orders</th><td><a href={`mailto:${site.quotesEmail}`}>{site.quotesEmail}</a><br />Answered within {site.quoteResponse}</td></tr>
          <tr><th scope="row">Shop orders, returns</th><td><a href={`mailto:${site.helpEmail}`}>{site.helpEmail}</a><br />Answered within 1 business day</td></tr>
          <tr><th scope="row">Procurement documents</th><td>W-9, COI and ACH forms by email request. See <a href="/pro/procurement">Procurement</a>.</td></tr>
        </tbody>
      </table>
      <p>Include your order or quote reference if you have one. It starts with FF- or FFQ-.</p>
    </ProsePage>
  );
}
