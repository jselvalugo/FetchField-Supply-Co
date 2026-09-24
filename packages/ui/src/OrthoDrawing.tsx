import { cx } from "./cx";

/**
 * Orthographic line drawing (spec §3.4). Authored in inches with the origin at
 * ground level, bottom-left of each view (y goes up). The component handles
 * scale, the ground line, dimension lines, callout balloons and the title block.
 */
export type Prim =
  | { t: "rect"; x: number; y: number; w: number; h: number; r?: number; hidden?: boolean; fill?: boolean }
  | { t: "circle"; cx: number; cy: number; r: number; hidden?: boolean; fill?: boolean }
  | { t: "line"; x1: number; y1: number; x2: number; y2: number; hidden?: boolean; center?: boolean }
  | { t: "poly"; points: Array<[number, number]>; closed?: boolean; hidden?: boolean };

export interface DrawingView {
  name: "Front" | "Side" | "Top" | "Plan";
  /** Overall extents in inches. */
  width: number;
  height: number;
  prims: Prim[];
  /** Numbered balloons pointing at a spot (inches, ground origin). */
  callouts?: Array<{ n: number; x: number; y: number }>;
  /** Hide the overall height dimension (e.g. on the top view, whose "height" is depth). */
  noHeightDim?: boolean;
}

export interface Drawing {
  title: string;
  number: string;
  views: DrawingView[];
  legend?: Array<{ n: number; text: string }>;
}

const W = 760;
const PAD_L = 64;
const PAD_R = 28;
const PAD_T = 36;
const GAP = 64;
const GAP_CALLOUTS = 96;
const MAX_H = 290;

const fmtIn = (v: number) => {
  const whole = Math.floor(v + 1e-9);
  const frac = v - whole;
  const eighths = Math.round(frac * 8);
  const map: Record<number, string> = { 0: "", 1: "⅛", 2: "¼", 3: "⅜", 4: "½", 5: "⅝", 6: "¾", 7: "⅞", 8: "" };
  const w = eighths === 8 ? whole + 1 : whole;
  return `${w || (map[eighths] ? "" : "0")}${map[eighths] ?? ""}″`;
};
const mm = (v: number) => `${Math.round(v * 25.4)}`;

export function OrthoDrawing({ drawing, className }: { drawing: Drawing; className?: string }) {
  const views = drawing.views;
  const sumW = views.reduce((s, v) => s + v.width, 0);
  const maxH = Math.max(...views.map((v) => v.height));
  // Gap after each view: wider when that view has callout balloons in it.
  const gaps = views.slice(0, -1).map((v) => (v.callouts?.length ? GAP_CALLOUTS : GAP));
  const gapSum = gaps.reduce((a, b) => a + b, 0);
  const availW = W - PAD_L - PAD_R - gapSum;
  const k = Math.min(availW / sumW, MAX_H / maxH);
  const ground = PAD_T + maxH * k;
  const totalViewsW = sumW * k + gapSum;
  let cursor = PAD_L + (availW + gapSum - totalViewsW) / 2;
  const H = ground + 128;

  // Height is dimensioned once; later views repeat it only when their height differs.
  let lastHeight: number | null = null;
  const placed = views.map((v, i) => {
    const x0 = cursor;
    cursor += v.width * k + (gaps[i] ?? 0);
    const plan = v.name === "Top" || v.name === "Plan";
    const showHeight = !v.noHeightDim && !plan && v.height !== lastHeight;
    if (!plan) lastHeight = v.height;
    return { v, x0, showHeight };
  });

  const summary = views
    .filter((v) => v.name !== "Top" && v.name !== "Plan")
    .map((v) => `${v.name} view ${fmtIn(v.width)} wide by ${fmtIn(v.height)} tall`)
    .join("; ");

  return (
    <figure className={cx("ff-drawing", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Technical drawing of ${drawing.title}. ${summary}.`}>
        <defs>
          <pattern id={`hatch-${drawing.number}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" className="ff-dw-hatch" />
          </pattern>
          <marker id={`arrow-${drawing.number}`} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 1 10 5 0 9Z" className="ff-dw-arrowhead" />
          </marker>
        </defs>

        {/* sheet border */}
        <rect x="6" y="6" width={W - 12} height={H - 12} className="ff-dw-sheet" />

        {placed.map(({ v, x0, showHeight }) => {
          const X = (x: number) => x0 + x * k;
          const Y = (y: number) => ground - y * k;
          const plan = v.name === "Top" || v.name === "Plan";
          const vx1 = X(v.width);
          const dimY = ground + 30;
          const arrow = `url(#arrow-${drawing.number})`;
          return (
            <g key={v.name}>
              {/* ground */}
              {!plan && (
                <>
                  <line x1={x0 - 14} y1={ground} x2={vx1 + 14} y2={ground} className="ff-dw-ground" />
                  <rect x={x0 - 14} y={ground} width={v.width * k + 28} height={7} fill={`url(#hatch-${drawing.number})`} />
                </>
              )}
              {v.prims.map((p, i) => {
                const cls = cx("ff-dw-line", "hidden" in p && p.hidden && "is-hidden", p.t === "line" && p.center && "is-center");
                switch (p.t) {
                  case "rect":
                    return (
                      <rect key={i} x={X(p.x)} y={Y(p.y + p.h)} width={p.w * k} height={p.h * k} rx={(p.r ?? 0) * k}
                        className={cx(cls, p.fill && "is-fill")} />
                    );
                  case "circle":
                    return <circle key={i} cx={X(p.cx)} cy={Y(p.cy)} r={p.r * k} className={cx(cls, p.fill && "is-fill")} />;
                  case "line":
                    return <line key={i} x1={X(p.x1)} y1={Y(p.y1)} x2={X(p.x2)} y2={Y(p.y2)} className={cls} />;
                  case "poly": {
                    const pts = p.points.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ");
                    return p.closed ? <polygon key={i} points={pts} className={cls} /> : <polyline key={i} points={pts} className={cls} />;
                  }
                }
              })}

              {/* width dimension */}
              <line x1={x0} y1={ground + 10} x2={x0} y2={dimY + 6} className="ff-dw-ext" />
              <line x1={vx1} y1={ground + 10} x2={vx1} y2={dimY + 6} className="ff-dw-ext" />
              <line x1={x0} y1={dimY} x2={vx1} y2={dimY} className="ff-dw-dim" markerStart={arrow} markerEnd={arrow} />
              <text x={(x0 + vx1) / 2} y={dimY - 6} className="ff-dw-text" textAnchor="middle">
                {fmtIn(v.width)} <tspan className="ff-dw-mm">{mm(v.width)}</tspan>
              </text>

              {/* height dimension, left of view */}
              {showHeight && (
                <g>
                  <line x1={x0 - 30} y1={ground} x2={x0 - 30} y2={Y(v.height)} className="ff-dw-dim" markerStart={arrow} markerEnd={arrow} />
                  <line x1={x0 - 36} y1={Y(v.height)} x2={x0 - 4} y2={Y(v.height)} className="ff-dw-ext" />
                  <text
                    x={x0 - 36}
                    y={(ground + Y(v.height)) / 2}
                    className="ff-dw-text"
                    textAnchor="middle"
                    transform={`rotate(-90 ${x0 - 36} ${(ground + Y(v.height)) / 2})`}
                  >
                    {fmtIn(v.height)} <tspan className="ff-dw-mm">{mm(v.height)}</tspan>
                  </text>
                </g>
              )}

              {/* callouts */}
              {v.callouts?.map((c) => {
                const bx = vx1 + 20;
                const by = Y(c.y);
                return (
                  <g key={c.n} className="ff-dw-callout">
                    <line x1={X(c.x)} y1={Y(c.y)} x2={bx - 9} y2={by} className="ff-dw-leader" />
                    <circle cx={X(c.x)} cy={Y(c.y)} r={2.2} className="ff-dw-dot" />
                    <circle cx={bx} cy={by} r={9} className="ff-dw-balloon" />
                    <text x={bx} y={by + 3.5} textAnchor="middle" className="ff-dw-balloon-text">{c.n}</text>
                  </g>
                );
              })}

              <text x={(x0 + vx1) / 2} y={dimY + 26} className="ff-dw-label" textAnchor="middle">
                {v.name.toUpperCase()} VIEW
              </text>
            </g>
          );
        })}

        {/* title block */}
        <g transform={`translate(${W - 6 - 330} ${H - 6 - 44})`} className="ff-dw-tb">
          <rect width="330" height="44" className="ff-dw-sheet" />
          <line x1="150" y1="0" x2="150" y2="44" className="ff-dw-ext" />
          <line x1="250" y1="0" x2="250" y2="44" className="ff-dw-ext" />
          <line x1="150" y1="22" x2="330" y2="22" className="ff-dw-ext" />
          <text x="10" y="18" className="ff-dw-tb-k">FETCHFIELD PRO</text>
          <text x="10" y="35" className="ff-dw-tb-v">{drawing.title.slice(0, 22)}</text>
          <text x="158" y="15" className="ff-dw-tb-k">DWG</text>
          <text x="186" y="15" className="ff-dw-tb-v">{drawing.number}</text>
          <text x="258" y="15" className="ff-dw-tb-k">SCALE</text>
          <text x="296" y="15" className="ff-dw-tb-v">NTS</text>
          <text x="158" y="37" className="ff-dw-tb-k">UNITS</text>
          <text x="194" y="37" className="ff-dw-tb-v">in [mm]</text>
          <text x="258" y="37" className="ff-dw-tb-k">SHEET</text>
          <text x="298" y="37" className="ff-dw-tb-v">1/1</text>
        </g>
      </svg>
      {drawing.legend?.length ? (
        <figcaption className="ff-drawing__legend">
          <ol>
            {drawing.legend.map((l) => (
              <li key={l.n}>
                <span className="ff-drawing__n" aria-hidden>{l.n}</span>
                <span className="ff-sr">Callout {l.n}: </span>
                {l.text}
              </li>
            ))}
          </ol>
        </figcaption>
      ) : null}
    </figure>
  );
}
