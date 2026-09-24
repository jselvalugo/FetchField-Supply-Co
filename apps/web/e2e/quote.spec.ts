import { expect, test } from "@playwright/test";

test("builds and submits a quote, re-priced on the server", async ({ page }) => {
  await page.goto("/pro/products/park-station-400");
  await expect(page.getByRole("heading", { level: 1, name: "Park Station 400" })).toBeVisible();

  // Tier table follows the quantity.
  await page.getByRole("button", { name: /increase quantity/i }).click();
  const qty = page.getByRole("spinbutton", { name: "Quantity (each)" });
  await qty.fill("6");
  await expect(page.locator("tr[aria-current='true'] th")).toHaveText("5–19");
  await page.getByRole("button", { name: "Add to quote" }).click();
  await expect(page.getByText("Added 6 to your quote list.")).toBeVisible();

  await page.goto("/pro/quote");
  await expect(page.getByRole("link", { name: "Park Station 400" })).toBeVisible();

  // Validation errors are shown next to the fields.
  await page.getByRole("button", { name: "Submit quote request" }).click();
  await expect(page.getByText("Enter your organization's name")).toBeVisible();

  await page.getByLabel("Organization name").fill("Example City Parks");
  await page.getByLabel("Organization type").selectOption("parks");
  await page.getByLabel("Your name").fill("Sam Rivera");
  await page.getByLabel("Email").fill("sam@example.gov");
  await page.getByLabel("Delivery ZIP").fill("97205");
  await page.getByRole("button", { name: "Submit quote request" }).click();

  await expect(page.getByText(/Reference FFQ-\d{6}-[0-9A-F]{6}/)).toBeVisible();
  // 6 × $359 (5–19 tier) = $2,154, computed by the server.
  await expect(page.getByText("$2,154").first()).toBeVisible();
  await page.goto("/pro/quote");
  await expect(page.getByText("Your quote list is empty")).toBeVisible();
});

test("quote and cart stay separate", async ({ page }) => {
  await page.goto("/pro/products/header-bags-case");
  await page.getByRole("button", { name: "Add to quote" }).click();
  await page.goto("/shop/cart");
  await expect(page.getByText("Your cart is empty")).toBeVisible();
});
