import type { Metadata, Viewport } from "next";
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/public-sans/wght.css";
import "@fontsource-variable/public-sans/wght-italic.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "FetchField Supply Co. | Dog park equipment and dog gear", template: "%s | FetchField Supply Co." },
  description:
    "Pet waste stations, agility equipment and fountains for parks, HOAs and apartment communities, plus tested gear for dog owners.",
  openGraph: { siteName: site.name, type: "website" },
  ...(site.noindex ? { robots: { index: false, follow: false } } : {}),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F1E8" },
    { media: "(prefers-color-scheme: dark)", color: "#111611" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US">
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
