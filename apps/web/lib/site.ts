export const site = {
  name: "FetchField Supply Co.",
  url: process.env.SITE_URL ?? "http://localhost:3000",
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
