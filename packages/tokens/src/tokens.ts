/**
 * FetchField design tokens: the one source for CSS variables and Tailwind.
 * Edit here, then run `npm run generate -w @fetchfield/tokens`.
 */

/** Brand palette (spec §3.2). */
export const palette = {
  field: "#2F5D3A",
  fieldDeep: "#1E3D26",
  chalk: "#F4F1E8",
  clay: "#C4623A",
  ink: "#1B1F1C",
  stone: "#8A8F87",
  sky: "#A9C6D6",
} as const;

/**
 * Accessibility-adjusted companions. Raw clay on chalk is 3.6:1 and stone on
 * chalk is 2.9:1, both under WCAG AA 4.5:1 for body-size text. These darker
 * steps are used whenever the color carries text.
 */
export const accessible = {
  clayAction: "#A84F2B", // 4.9:1 against chalk, both directions
  clayActionHover: "#8F4224",
  stoneInk: "#5F645C", // 5.4:1 on chalk
  chalkShade: "#E9E4D6", // raised/sunken surfaces on chalk
  chalkLine: "#D6D0BF",
  fieldLight: "#8FBF98", // green text on dark surfaces
  clayOnDark: "#E48C66", // clay text on dark surfaces
  night: "#111611", // dark-mode page
  nightRaised: "#1A211B",
  nightLine: "#2E372F",
} as const;

type SemanticSet = Record<string, string>;

/** Semantic roles. Components use these, never raw hex. */
export const light: SemanticSet = {
  "bg": palette.chalk,
  "surface": "#FBF9F3",
  "sunken": accessible.chalkShade,
  "line": accessible.chalkLine,
  "line-strong": palette.stone,
  "text": palette.ink,
  "muted": accessible.stoneInk,
  "brand": palette.field,
  "brand-deep": palette.fieldDeep,
  "on-brand": palette.chalk,
  "action": accessible.clayAction,
  "action-hover": accessible.clayActionHover,
  "on-action": "#FFFDF7",
  "accent": palette.clay,
  "info": palette.sky,
  "info-ink": "#274B5C",
  "focus": "#1B5E9A",
  "danger": "#9B2C1F",
  "ok": palette.field,
};

export const dark: SemanticSet = {
  "bg": accessible.night,
  "surface": accessible.nightRaised,
  "sunken": "#0C100C",
  "line": accessible.nightLine,
  "line-strong": "#4D564E",
  "text": "#ECE8DC",
  "muted": "#A7ACA3",
  "brand": accessible.fieldLight,
  "brand-deep": "#0E1F13",
  "on-brand": palette.chalk,
  "action": accessible.clayAction,
  "action-hover": "#BA5A33",
  "on-action": "#FFFDF7",
  "accent": accessible.clayOnDark,
  "info": palette.sky,
  "info-ink": palette.sky,
  "focus": "#8CC4F0",
  "danger": "#F08A7A",
  "ok": accessible.fieldLight,
};

export const fonts = {
  display: `"Archivo Variable", "Archivo", "Arial Narrow", system-ui, sans-serif`,
  body: `"Public Sans Variable", "Public Sans", system-ui, -apple-system, "Segoe UI", sans-serif`,
  mono: `"IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace`,
} as const;

/** Three weights site-wide (spec §3.5). */
export const weights = { regular: 400, strong: 600, display: 800 } as const;

/** Type scale in rem, ~1.25 ratio, tightened at display sizes. */
export const typeScale = {
  "xs": "0.75rem",
  "sm": "0.875rem",
  "base": "1rem",
  "lg": "1.125rem",
  "xl": "1.375rem",
  "2xl": "1.75rem",
  "3xl": "2.25rem",
  "4xl": "3rem",
  "5xl": "4rem",
  "6xl": "5.5rem",
} as const;

export const space = {
  "gutter": "1rem",
  "gutter-lg": "2.5rem",
  "section": "clamp(3.5rem, 8vw, 7rem)",
  "measure": "68ch",
  "page": "84rem",
} as const;

export const radius = { plate: "3px", blaze: "5px", control: "2px" } as const;
