import type { Category } from "./types";

export const proCategories: Category[] = [
  { slug: "waste-stations", storefront: "pro", name: "Waste stations", code: "WS", blaze: "circle",
    blurb: "Dispenser, bin and sign on one post.",
    intro: "Complete stations and parts. Every station takes standard header-pack or roll bags, so refills never lock you to us." },
  { slug: "bags-refills", storefront: "pro", name: "Bags & refills", code: "BR", blaze: "circle",
    blurb: "Header-pack and roll bags by the case.",
    intro: "Cases ship from stock. Tier pricing applies per case and mixes across bag types on one order." },
  { slug: "agility", storefront: "pro", name: "Agility", code: "AG", blaze: "triangle",
    blurb: "A-frames, weaves and jumps for public parks.",
    intro: "Sized for public dog parks, not competition rings. Textured surfaces, rounded edges, and anchoring for unsupervised use." },
  { slug: "water", storefront: "pro", name: "Water", code: "WF", blaze: "square",
    blurb: "Pedestal fountains with a dog bowl at grade.",
    intro: "Fountains plumb to a standard 3/4\" supply. Freeze-resistant valves are available for northern sites." },
  { slug: "seating-shade", storefront: "pro", name: "Seating & shade", code: "SS", blaze: "square",
    blurb: "Benches and shade for the people holding leashes.",
    intro: "Recycled-plastic and powder-coated steel. Nothing that splinters, nothing that needs paint." },
  { slug: "fencing-gates", storefront: "pro", name: "Fencing & gates", code: "FG", blaze: "square",
    blurb: "Double-gate entries and run fencing.",
    intro: "Fencing is priced per site because runs, grade and gate count change the bill of materials. Send a plan and we'll quote it." },
  { slug: "surfacing", storefront: "pro", name: "Surfacing", code: "SU", blaze: "square",
    blurb: "K9 turf and engineered wood fiber.",
    intro: "Surfaces chosen for drainage and cleanup. Priced per square foot with install available in our service area." },
  { slug: "signage", storefront: "pro", name: "Signage", code: "SG", blaze: "square",
    blurb: "Rules, hours and small/large dog area signs.",
    intro: "Aluminum signs with your park name and rules. Standard text included; custom text at no extra charge." },
  { slug: "service-plans", storefront: "pro", name: "Service plans", code: "SP", blaze: "diamond",
    blurb: "We install it, empty it and restock it.",
    intro: "Monthly station servicing, priced per station. Check your ZIP to see if you're in a service area." },
];

export const shopCategories: Category[] = [
  { slug: "walk", storefront: "shop", name: "Walk", code: "WK", blaze: "circle",
    blurb: "Leashes, collars and harnesses.",
    intro: "Hardware we've pulled on, clipped in the rain, and left in a wet car. Sizes are measured, not copied off a label." },
  { slug: "play", storefront: "shop", name: "Play", code: "PL", blaze: "triangle",
    blurb: "Balls, tugs and long lines for the field.",
    intro: "Toys for outdoor play. We don't call any toy indestructible. We tell you how it held up for our dogs." },
  { slug: "eat-drink", storefront: "shop", name: "Eat & drink", code: "ED", blaze: "circle",
    blurb: "Bowls for home and the trailhead.",
    intro: "Stainless and silicone bowls, with capacities in cups and millilitres." },
  { slug: "travel", storefront: "shop", name: "Travel", code: "TR", blaze: "diamond",
    blurb: "Car covers, bottles and packs.",
    intro: "Gear for getting to the park and back without the mud coming home with you." },
  { slug: "clean-up", storefront: "shop", name: "Clean up", code: "CU", blaze: "circle",
    blurb: "Bags and dispensers.",
    intro: "The same bags we stock in park stations, in household quantities." },
  { slug: "comfort", storefront: "shop", name: "Comfort", code: "CO", blaze: "square",
    blurb: "Beds, mats and covers.",
    intro: "Washable things for tired dogs." },
];

export const allCategories = [...proCategories, ...shopCategories];
export const findCategory = (storefront: "pro" | "shop", slug: string) =>
  allCategories.find((c) => c.storefront === storefront && c.slug === slug);
