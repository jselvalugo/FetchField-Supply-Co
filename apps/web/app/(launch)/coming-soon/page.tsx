import type { Metadata } from "next";
import { Logo, OrthoDrawing, TrailMarker } from "@fetchfield/ui";
import { findProProduct } from "@/lib/catalog";
import { site } from "@/lib/site";
import { LaunchList } from "./LaunchList";

export const metadata: Metadata = {
  title: "Opening soon",
  description: "FetchField Supply Co. outfits the places where dogs live and play. Dog park equipment for parks and properties, and tested gear for dog owners.",
};

export default async function ComingSoon() {
  const station = await findProProduct("park-station-400");
  return (
    <main id="main" className="launch turf on-dark">
      <div className="chalk-line" aria-hidden />
      <div className="wrap launch__inner">
        <header className="launch__top">
          <Logo inverse />
          <p className="eyebrow m-0">Opening soon</p>
        </header>

        <div className="launch__grid">
          <section className="launch__copy" aria-labelledby="launch-h">
            <h1 id="launch-h" className="display display--wide display--caps launch__h">
              We know the park,<br />and we know the dog.
            </h1>
            <p className="lede launch__lede">
              FetchField Supply Co. outfits the places where dogs live and play. We're finishing the catalog now.
            </p>

            <ul className="launch__two">
              <li>
                <p className="launch__k"><TrailMarker shape="square" tone="chalk" size={12} /> FetchField Pro</p>
                <p className="m-0">Waste stations, agility, fountains and fencing for parks, HOAs and apartment communities. Specs, quantity pricing and quotes within one business day.</p>
              </li>
              <li>
                <p className="launch__k"><TrailMarker shape="circle" tone="chalk" size={12} /> FetchField Shop</p>
                <p className="m-0">Leashes, bowls and park gear. We sample and test every item before we sell it.</p>
              </li>
            </ul>

            <LaunchList />
          </section>

          {station?.drawing && (
            <figure className="launch__board" aria-label="On the drawing board">
              <p className="launch__board-k">On the drawing board · {station.model}</p>
              <OrthoDrawing drawing={{ ...station.drawing, legend: undefined }} />
            </figure>
          )}
        </div>

        <footer className="launch__foot">
          <p className="m-0">Buying for a city, park district or HOA now? <a className="link" href={`mailto:${site.quotesEmail}`}>{site.quotesEmail}</a></p>
          <a className="link" href="/preview">Team preview</a>
        </footer>
      </div>
    </main>
  );
}
