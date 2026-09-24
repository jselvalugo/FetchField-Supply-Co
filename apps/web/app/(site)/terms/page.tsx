import type { Metadata } from "next";
import { ProsePage } from "@/components/common/ProsePage";

export const metadata: Metadata = { title: "Terms of sale" };

export default function Terms() {
  return (
    <ProsePage eyebrow="Legal" title="Terms of sale" updated="2026-09-24" draft>
      <h2>Prices and availability</h2>
      <p>Prices are in US dollars. We confirm price and stock on our server when you pay. If an item sold out after you added it, we tell you before charging.</p>
      <h2>Product claims</h2>
      <p>We describe products from our own testing and the maker's documentation. We don't call products "non-toxic," "vet-approved" or "indestructible" unless we hold documentation that backs it up.</p>
      <h2>California Proposition 65</h2>
      <p>Where a product requires a Proposition 65 warning, it's shown on the product page and at checkout for California addresses.</p>
      <h2>Commercial orders</h2>
      <p>Quotes are valid for 30 days. Net-30 terms apply only to approved accounts. Warranty terms for commercial equipment are shown on each product's spec plate and in the final quote.</p>
      <h2>Shipping delays</h2>
      <p>See <a href="/shipping">Shipping</a> for how we handle delays, including your right to cancel.</p>
    </ProsePage>
  );
}
