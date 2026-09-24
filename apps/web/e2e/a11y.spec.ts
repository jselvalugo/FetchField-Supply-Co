import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = [
  "/", "/pro", "/pro/waste-stations", "/pro/products/park-station-400", "/pro/quote", "/pro/procurement",
  "/shop", "/shop/walk", "/shop/products/field-harness", "/shop/cart", "/shop/track",
  "/field-notes/how-many-pet-waste-stations-apartment-complex", "/returns",
];

for (const path of pages) {
  test(`axe: ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
    expect(summary, summary.join("\n")).toEqual([]);
  });
}
