import Link from "next/link";
import { Logo, TrailMarker } from "@fetchfield/ui";
import { site } from "@/lib/site";

const cols = [
  {
    h: "FetchField Pro",
    links: [
      ["Waste stations", "/pro/waste-stations"],
      ["Bags & refills", "/pro/bags-refills"],
      ["Agility", "/pro/agility"],
      ["Request a quote", "/pro/quote"],
      ["Procurement & W-9", "/pro/procurement"],
      ["Installed parks", "/pro/projects"],
    ],
  },
  {
    h: "FetchField Shop",
    links: [
      ["Walk", "/shop/walk"],
      ["Play", "/shop/play"],
      ["Travel", "/shop/travel"],
      ["Track an order", "/shop/track"],
      ["Shipping", "/shipping"],
      ["Returns", "/returns"],
    ],
  },
  {
    h: "Company",
    links: [
      ["About", "/about"],
      ["Field notes", "/field-notes"],
      ["Contact", "/contact"],
      ["Accessibility", "/accessibility"],
      ["Privacy", "/privacy"],
      ["Terms of sale", "/terms"],
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="turf on-dark site-footer">
      <div className="chalk-line" aria-hidden />
      <div className="wrap site-footer__inner">
        <div className="site-footer__brand">
          <Logo inverse />
          <p className="site-footer__line">We know the park, and we know the dog.</p>
          <dl className="site-footer__contact mono">
            <div><dt>Quotes</dt><dd><a className="link" href={`mailto:${site.quotesEmail}`}>{site.quotesEmail}</a></dd></div>
            <div><dt>Orders</dt><dd><a className="link" href={`mailto:${site.helpEmail}`}>{site.helpEmail}</a></dd></div>
            <div><dt>Quote reply</dt><dd>Within {site.quoteResponse}</dd></div>
          </dl>
        </div>
        {cols.map((c) => (
          <nav key={c.h} aria-label={c.h} className="site-footer__col">
            <h2 className="site-footer__h">{c.h}</h2>
            <ul>
              {c.links.map(([label, href]) => (
                <li key={href}><Link href={href}>{label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="wrap site-footer__key">
        <p className="eyebrow">Trail key</p>
        <ul>
          <li><TrailMarker shape="circle" tone="chalk" size={12} /> Stations, bags, daily gear</li>
          <li><TrailMarker shape="triangle" tone="chalk" size={12} /> Play &amp; agility</li>
          <li><TrailMarker shape="square" tone="chalk" size={12} /> Site infrastructure, home</li>
          <li><TrailMarker shape="diamond" tone="chalk" size={12} /> Services, on the road</li>
        </ul>
        <p className="site-footer__small">© {new Date().getFullYear()} FetchField Supply Co.</p>
      </div>
    </footer>
  );
}
