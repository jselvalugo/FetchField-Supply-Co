"use client";

import { useState } from "react";

/**
 * Signups per day, single series: bars in the brand green, 4px rounded tops
 * anchored to the baseline, 2px gaps, recessive grid. Every bar is a
 * focusable hit target with a tooltip, and a table view carries the same numbers.
 */
export function SignupChart({ days }: { days: Array<{ date: string; label: string; count: number }> }) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const W = 640, H = 180, L = 28, B = 22, T = 8;
  const max = Math.max(4, ...days.map((d) => d.count));
  const niceMax = Math.ceil(max / 4) * 4;
  const plotW = W - L, plotH = H - B - T;
  const step = plotW / days.length;
  const bw = Math.max(4, step - 2);
  const y = (v: number) => T + plotH - (v / niceMax) * plotH;
  const ticks = [0, niceMax / 2, niceMax];

  return (
    <div className="adm-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Launch-list signups per day, last 14 days">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W} y1={y(t)} y2={y(t)} className={t === 0 ? "adm-chart__base" : "adm-chart__grid"} />
            <text x={L - 6} y={y(t) + 3} textAnchor="end" className="adm-chart__tick">{t}</text>
          </g>
        ))}
        {days.map((d, i) => {
          const x = L + i * step + 1;
          const top = y(d.count);
          const h = T + plotH - top;
          const r = Math.min(4, h, bw / 2);
          const text = `${d.label}: ${d.count} signup${d.count === 1 ? "" : "s"}`;
          const show = () => setTip({ x: ((x + bw / 2) / W) * 100, y: (Math.min(top, y(0) - 1) / H) * 100, text });
          return (
            <g key={d.date}>
              <rect x={x - 1} y={T} width={step} height={plotH} className="adm-chart__hit" tabIndex={0} aria-label={text}
                onPointerEnter={show} onPointerLeave={() => setTip(null)} onFocus={show} onBlur={() => setTip(null)} />
              {h > 0 && (
                <path className="adm-chart__bar" pointerEvents="none"
                  d={`M${x},${y(0)} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${y(0)} Z`} />
              )}
              {(i % 2 === 0 || i === days.length - 1) && (
                <text x={x + bw / 2} y={H - 6} textAnchor="middle" className="adm-chart__tick">{d.label}</text>
              )}
            </g>
          );
        })}
      </svg>
      {tip && <div className="adm-chart__tip" style={{ left: `${tip.x}%`, top: `${tip.y}%` }}>{tip.text}</div>}
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-muted">View as table</summary>
        <table className="adm-table mt-2">
          <thead><tr><th scope="col">Day</th><th scope="col" className="num">Signups</th></tr></thead>
          <tbody>{days.map((d) => <tr key={d.date}><td>{d.label}</td><td className="num">{d.count}</td></tr>)}</tbody>
        </table>
      </details>
    </div>
  );
}
