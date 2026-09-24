"use client";

import { useId } from "react";

export function QtyStepper({ value, onChange, min = 1, max = 9999, label = "Quantity" }: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  const id = useId();
  const set = (n: number) => onChange(Math.max(min, Math.min(max, Number.isFinite(n) ? Math.floor(n) : min)));
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="stepper">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= min} aria-label={`Decrease ${label.toLowerCase()}`}>−</button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => set(Number(e.target.value))}
        />
        <button type="button" onClick={() => set(value + 1)} disabled={value >= max} aria-label={`Increase ${label.toLowerCase()}`}>+</button>
      </div>
    </div>
  );
}
