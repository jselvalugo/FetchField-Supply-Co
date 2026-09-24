import type { Metadata } from "next";
import { ProsePage } from "@/components/common/ProsePage";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Accessibility" };

export default function Accessibility() {
  return (
    <ProsePage eyebrow="Company" title="Accessibility statement" updated="2026-09-24">
      <p>We aim to meet WCAG 2.2 Level AA across the site. Many of our commercial buyers work for public agencies, and everyone should be able to use a store.</p>
      <h2>What we've done</h2>
      <ul>
        <li>Every text color pairing is checked at 4.5:1 contrast or better. Our accent orange is darkened wherever it carries text.</li>
        <li>Everything works with a keyboard, with a visible focus outline.</li>
        <li>Technical drawings have text descriptions, and every spec is also listed as text in the spec plate.</li>
        <li>Forms have labels, and errors are announced and explained next to the field.</li>
        <li>Animation is minimal and turns off when your system asks for reduced motion.</li>
      </ul>
      <h2>Known gaps</h2>
      <p>Spec sheets print from the browser. We're working on tagged PDFs for bid packets.</p>
      <h2>Tell us</h2>
      <p>If something doesn't work for you, email <a href={`mailto:${site.helpEmail}`}>{site.helpEmail}</a>. We'll reply within two business days and help you place your order another way in the meantime.</p>
    </ProsePage>
  );
}
