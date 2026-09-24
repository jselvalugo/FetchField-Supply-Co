import type { ReactNode } from "react";

export interface Article {
  slug: string;
  title: string;
  /** The search question this answers (spec §10 SEO). */
  question: string;
  description: string;
  audience: "Parks & property" | "Dog owners";
  readMinutes: number;
  updated: string;
  body: ReactNode;
  related: Array<{ href: string; label: string }>;
}

export const articles: Article[] = [
  {
    slug: "how-many-pet-waste-stations-apartment-complex",
    title: "How many pet waste stations does an apartment complex need?",
    question: "how many pet waste stations per apartment complex",
    description: "A planning method based on walking routes, not unit counts, with a worked example for a 240-unit property.",
    audience: "Parks & property",
    readMinutes: 5,
    updated: "2026-09-01",
    related: [
      { href: "/pro/products/park-station-400", label: "Park Station 400" },
      { href: "/pro/products/station-service", label: "Station Service Plan" },
    ],
    body: (
      <>
        <p>
          Start from where dogs walk, not from how many units you have. Residents walk dogs on the same few routes: out of each building door,
          along the path to the nearest grass, and around the loop they use every day. A station works when it's on that route, before the
          dog finds the grass.
        </p>
        <h2>Our planning method</h2>
        <ol>
          <li><strong>One station within sight of every building exit</strong> that dogs use. Residents decide whether to carry a bag before they leave the door.</li>
          <li><strong>One at every entrance to a dog run or relief area</strong>, on the exit side of the gate.</li>
          <li><strong>One every 300–400 ft along walking loops.</strong> Past that, people stop carrying the bag to the next bin.</li>
          <li><strong>Add one where you already find waste.</strong> Walk the property on a Monday morning; the problem spots are obvious.</li>
        </ol>
        <p>
          This is a rule of thumb from site walks, not a code requirement. Some municipalities and HOA covenants set their own minimums, so
          check those first.
        </p>
        <h2>Worked example: 240 units, 6 buildings</h2>
        <table>
          <thead>
            <tr><th>Location</th><th className="num">Stations</th></tr>
          </thead>
          <tbody>
            <tr><td>Building exits used by dog owners (6 buildings, 1–2 exits each)</td><td className="num">8</td></tr>
            <tr><td>Fenced dog run, one gate</td><td className="num">1</td></tr>
            <tr><td>Perimeter walking loop, 1,400 ft</td><td className="num">3</td></tr>
            <tr><td>Known problem spot by the leasing office lawn</td><td className="num">1</td></tr>
            <tr><th scope="row">Total</th><th className="num">13</th></tr>
          </tbody>
        </table>
        <p>
          Thirteen stations puts this property in the 5–19 price tier. On bags, busy stations use about one 2,000-bag case every six weeks.
          Plan for roughly 8–9 cases a month across 13 stations until you have your own numbers.
        </p>
        <h2>Emptying and restocking</h2>
        <p>
          A 10-gallon bin at a busy exit fills in 3–5 days in summer. Weekly service works for most stations; the dog run usually needs twice a
          week. If nobody on staff owns this job, stations overflow and residents stop using them. That's why we offer a service plan.
        </p>
      </>
    ),
  },
  {
    slug: "planning-a-double-gate-dog-park-entry",
    title: "Planning a double-gate entry for an off-leash area",
    question: "double gate entry dog park dimensions",
    description: "Vestibule sizes, gate swing, latch height and accessibility for dog park entries.",
    audience: "Parks & property",
    readMinutes: 4,
    updated: "2026-08-18",
    related: [{ href: "/pro/products/double-gate-entry", label: "Double-Gate Entry Vestibule" }],
    body: (
      <>
        <p>
          A double-gate entry, sometimes called an airlock or vestibule, gives owners a closed space to unclip leashes. Without one, dogs
          bolt through the gate every time someone enters.
        </p>
        <h2>Sizing</h2>
        <ul>
          <li><strong>8 × 10 ft</strong> holds two owners with dogs comfortably. Smaller than 6 × 6 ft and people hold the inner gate open while they wait.</li>
          <li><strong>Gates 4 ft wide</strong> fit strollers and wheelchairs. Add a separate 10–12 ft maintenance gate for mowers and trucks.</li>
          <li><strong>Swing both gates into the vestibule</strong>, so a dog pushing from inside the park closes the gate instead of opening it.</li>
        </ul>
        <h2>Latches and accessibility</h2>
        <p>
          Use two-sided gravity latches that can be worked with a closed fist. Mount operable parts between 15 and 48 in above the ground so they're
          in accessible reach range, and keep a level, firm surface through both gates.
        </p>
        <h2>What changes the price</h2>
        <p>
          Fence height (5 or 6 ft), the number of gates, slope across the entry, and whether you need a concrete pad. That's why we quote
          entries per site instead of listing one price.
        </p>
      </>
    ),
  },
  {
    slug: "how-to-measure-your-dog-for-a-harness",
    title: "How to measure your dog for a harness",
    question: "how to measure dog for harness",
    description: "Two measurements, a soft tape, and the two-finger check.",
    audience: "Dog owners",
    readMinutes: 3,
    updated: "2026-09-10",
    related: [{ href: "/shop/products/field-harness", label: "Field Harness" }],
    body: (
      <>
        <p>You need a soft tape measure (or a piece of string and a ruler) and about two minutes with your dog standing.</p>
        <h2>1. Chest girth</h2>
        <p>Measure around the widest part of the rib cage, just behind the front legs. This is the number that decides the size.</p>
        <h2>2. Neck</h2>
        <p>Measure where a collar sits, at the base of the neck. It confirms the fit when your dog falls between two sizes.</p>
        <h2>The two-finger check</h2>
        <p>
          Once it's on, you should fit two flat fingers under every strap. Any looser and a dog can back out. Any tighter and it rubs behind
          the front legs.
        </p>
        <p>Between sizes? Go up for deep-chested dogs (greyhounds, boxers) and down for barrel-chested ones (bulldogs, pugs).</p>
      </>
    ),
  },
];

export const findArticle = (slug: string) => articles.find((a) => a.slug === slug) ?? null;
