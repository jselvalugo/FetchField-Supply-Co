import { cx } from "./cx";

/**
 * A designed placeholder for photography we haven't shot yet (spec §3.6).
 * It reads as a shot-list card: what the photo must show, so the gap is
 * obvious to us and honest to visitors. Every use is marked
 * PLACEHOLDER-PHOTO in the calling code.
 */
export function PhotoSlot({
  brief,
  ratio = "4 / 3",
  tone = "light",
  shotId,
  className,
}: {
  /** What the real photo should show. Also the alt text. */
  brief: string;
  ratio?: string;
  tone?: "light" | "dark";
  shotId?: string;
  className?: string;
}) {
  return (
    <div className={cx("ff-photo-slot", tone === "dark" && "ff-photo-slot--dark", className)} style={{ aspectRatio: ratio }} role="img" aria-label={`Photo coming soon: ${brief}`}>
      <svg className="ff-photo-slot__frame" aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M0 12V0h12M88 0h12v12M100 88v12H88M12 100H0V88" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="ff-photo-slot__body">
        <span className="ff-photo-slot__tag">{shotId ? `Shot ${shotId}` : "Photo to come"}</span>
        <p className="ff-photo-slot__brief">{brief}</p>
      </div>
    </div>
  );
}
