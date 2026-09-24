import type { ReactNode } from "react";
import { cx } from "./cx";

export interface SpecRow {
  label: string;
  value: ReactNode;
  /** Optional unit or qualifier shown in muted type after the value. */
  note?: string;
}

/**
 * The stamped equipment nameplate (spec §3.4). Double-ruled border, corner
 * rivets, mono type. Uses a real <dl>, so screen readers read label/value pairs.
 */
export function SpecPlate({
  title = "Equipment data",
  model,
  rows,
  footer,
  className,
}: {
  title?: string;
  model: string;
  rows: SpecRow[];
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("ff-plate", className)} aria-label={`${title}, model ${model}`}>
      <span className="ff-plate__rivet" data-pos="tl" aria-hidden />
      <span className="ff-plate__rivet" data-pos="tr" aria-hidden />
      <span className="ff-plate__rivet" data-pos="bl" aria-hidden />
      <span className="ff-plate__rivet" data-pos="br" aria-hidden />
      <header className="ff-plate__head">
        <span className="ff-plate__maker">FetchField Pro</span>
        <span className="ff-plate__title">{title}</span>
        <span className="ff-plate__model">
          <span className="ff-plate__k">Model</span> {model}
        </span>
      </header>
      <dl className="ff-plate__rows">
        {rows.map((r) => (
          <div className="ff-plate__row" key={r.label}>
            <dt>{r.label}</dt>
            <dd>
              {r.value}
              {r.note ? <span className="ff-plate__note"> {r.note}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
      {footer ? <footer className="ff-plate__foot">{footer}</footer> : null}
    </section>
  );
}
