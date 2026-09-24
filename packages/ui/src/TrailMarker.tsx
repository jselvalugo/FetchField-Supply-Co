import { cx } from "./cx";

export type BlazeShape = "circle" | "square" | "triangle" | "diamond";

/**
 * A painted trail blaze. Shapes carry meaning across the site:
 *   Pro:  circle = stations & consumables · triangle = play & agility
 *         square = site infrastructure · diamond = services
 *   Shop: circle = daily gear · triangle = play · square = home · diamond = on the road
 */
export function TrailMarker({
  shape,
  size = 20,
  tone = "brand",
  className,
  label,
}: {
  shape: BlazeShape;
  size?: number;
  tone?: "brand" | "ink" | "chalk" | "outline";
  className?: string;
  /** Accessible name. Omit when the marker sits next to visible text that says the same. */
  label?: string;
}) {
  const s = 24;
  const shapeEl = {
    circle: <circle cx={12} cy={12} r={10} />,
    square: <rect x={2.5} y={2.5} width={19} height={19} rx={1.5} />,
    triangle: <path d="M12 2.5 22 20.5H2Z" strokeLinejoin="round" />,
    diamond: <path d="M12 1.5 22.5 12 12 22.5 1.5 12Z" strokeLinejoin="round" />,
  }[shape];
  return (
    <svg
      className={cx("ff-blaze", `ff-blaze--${tone}`, className)}
      width={size}
      height={size}
      viewBox={`0 0 ${s} ${s}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {shapeEl}
    </svg>
  );
}
