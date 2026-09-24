import type { Metadata } from "next";
import { ProsePage } from "@/components/common/ProsePage";

export const metadata: Metadata = { title: "About", description: "FetchField Supply Co. outfits the places where dogs live and play: commercial dog park equipment and tested gear for dog owners." };

export default function About() {
  return (
    <ProsePage eyebrow="Company" title="About FetchField" lede={<p className="m-0">We know the park, and we know the dog.</p>}>
      <p>FetchField Supply Co. sells two ways under one name.</p>
      <p><strong>FetchField Pro</strong> supplies dog park and property equipment to cities, parks departments, HOAs, apartment communities and contractors: waste stations, bags, agility, fountains, seating, fencing, surfacing and signage. Buyers there need specs, quotes and paperwork, so that's what the Pro side is built around.</p>
      <p><strong>FetchField Shop</strong> sells gear to dog owners: leashes, collars, harnesses, bowls, toys and travel gear. Every item comes from a vetted maker, and we order a sample, test it, measure it and write the description ourselves before it goes on sale.</p>
      <h2 id="status">Where things stand</h2>
      <p>This site is in preview. The products, specifications and prices you see are <strong>sample data</strong> we're using to build and test the store. We'll replace them with manufacturer-confirmed figures before we take real orders, and the notice at the top of every page will come down then.</p>
      <p>Photos are placeholders for the same reason. Each grey frame describes the photo we'll shoot, and we won't use AI-generated pictures of dogs or products.</p>
      <h2>How we source</h2>
      <p>Commercial equipment comes from US manufacturers and fabricators. Shop items come from a small number of makers, some overseas. We never publish a supplier's copy or photos as our own, we list only what's actually in stock, and we show delivery as a date range from real carrier times.</p>
    </ProsePage>
  );
}
