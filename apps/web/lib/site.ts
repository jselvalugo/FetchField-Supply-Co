export const site = {
  name: "FetchField Supply Co.",
  // Netlify sets URL to the primary site URL.
  url: process.env.SITE_URL ?? process.env.URL ?? "http://localhost:3000",
  noindex: process.env.SITE_NOINDEX === "1",
  /** Public visitors see /coming-soon; the team unlocks the full site at /preview. */
  comingSoon: process.env.COMING_SOON === "1",
  /**
   * Shown in a slim bar while the catalog is sample data. Set to false once
   * specs and prices are manufacturer-confirmed.
   */
  sampleCatalog: true,
  // TODO(domain): replace once the domain is chosen (spec §15).
  quotesEmail: "quotes@fetchfield.example",
  helpEmail: "help@fetchfield.example",
  quoteResponse: "1 business day",
  freeShippingCents: 5000,
  flatShippingCents: 695,
  returnWindowDays: 30,
} as const;
