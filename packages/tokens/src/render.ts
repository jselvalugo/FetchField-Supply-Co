import { palette, light, dark, fonts, typeScale, space, radius, weights } from "./tokens.ts";

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
const block = (entries: Record<string, string | number>, prefix: string, indent = "  ") =>
  Object.entries(entries)
    .map(([k, v]) => `${indent}--${prefix}${kebab(k)}: ${v};`)
    .join("\n");

/**
 * Renders tokens.css. Output has three parts:
 * 1. Raw palette + semantic roles as CSS variables (light, then dark overrides).
 * 2. A Tailwind v4 `@theme inline` block mapping utilities to those variables,
 *    so `bg-brand` or `text-muted` follow the theme automatically and there is
 *    no way to reach for an off-palette color.
 */
export function renderCss(): string {
  const rawPalette = Object.fromEntries(Object.entries(palette).map(([k, v]) => [kebab(k), v]));
  const darkBlock = block(dark, "c-", "    ");
  return `/* Generated from src/tokens.ts. Do not edit by hand. */

:root {
  color-scheme: light dark;
${block(rawPalette, "")}
${block(light, "c-")}
${block(fonts, "font-")}
${block(weights, "w-")}
${block(space, "")}
${block(radius, "radius-")}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${darkBlock}
  }
}
:root[data-theme="dark"] {
${block(dark, "c-")}
}

@theme inline {
  --color-*: initial;
${Object.keys(light).map((k) => `  --color-${k}: var(--c-${k});`).join("\n")}
  --color-transparent: transparent;
  --color-current: currentColor;
  --font-display: var(--font-display);
  --font-body: var(--font-body);
  --font-mono: var(--font-mono);
${Object.entries(typeScale).map(([k, v]) => `  --text-${k}: ${v};`).join("\n")}
  --radius-plate: var(--radius-plate);
  --radius-blaze: var(--radius-blaze);
  --radius-control: var(--radius-control);
}
`;
}
