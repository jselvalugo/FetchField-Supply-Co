import Image from "next/image";
import { PhotoSlot } from "@fetchfield/ui";
import type { Shot } from "@/lib/catalog/types";

/**
 * Real photo when we have one, otherwise the shot-list placeholder.
 * PLACEHOLDER-PHOTO: every Shot without `src` renders a PhotoSlot. Search the
 * catalog for `shotId` to get the full shot list for the photographer.
 */
export function Photo({ shot, ratio = "4 / 3", tone, sizes = "(min-width: 1000px) 50vw, 100vw", priority }: {
  shot: Shot;
  ratio?: string;
  tone?: "light" | "dark";
  sizes?: string;
  priority?: boolean;
}) {
  if (shot.src) {
    return (
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: ratio }}>
        <Image src={shot.src} alt={shot.brief} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
    );
  }
  return <PhotoSlot brief={shot.brief} shotId={shot.shotId} ratio={ratio} tone={tone} />;
}
