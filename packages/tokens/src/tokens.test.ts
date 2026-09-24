import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderCss } from "./render.ts";
import { accessible, light, palette } from "./tokens.ts";

function luminance(hex: string): number {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m) as [number, number];
  return (x + 0.05) / (y + 0.05);
};

describe("tokens", () => {
  it("tokens.css is up to date with tokens.ts", () => {
    const onDisk = readFileSync(new URL("../tokens.css", import.meta.url), "utf8");
    expect(onDisk).toBe(renderCss());
  });

  it("meets WCAG AA 4.5:1 for every text pairing we use", () => {
    expect(contrast(light.text!, light.bg!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light.muted!, light.bg!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light.muted!, light.sunken!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light.brand!, light.bg!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light["on-action"]!, light.action!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(accessible.clayAction, palette.chalk)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(palette.chalk, palette.fieldDeep)).toBeGreaterThanOrEqual(4.5);
  });

  it("documents why raw clay and stone are not used for text", () => {
    expect(contrast(palette.clay, palette.chalk)).toBeLessThan(4.5);
    expect(contrast(palette.stone, palette.chalk)).toBeLessThan(4.5);
  });
});
