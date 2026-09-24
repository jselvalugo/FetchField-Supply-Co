import { expect, test } from "@playwright/test";

test("adds a variant to the cart and reaches checkout safely", async ({ page }) => {
  await page.goto("/shop/products/field-harness");
  // Size is required before adding.
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Choose a size.")).toBeVisible();
  await page.getByText("Chest 22–28 in").click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("In your cart.")).toBeVisible();

  // Delivery estimate is a range, from a ZIP.
  await page.getByLabel("Delivery to ZIP").fill("99501");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/Arrives .+ – .+ to 99501/)).toBeVisible();
  await expect(page.getByText(/Adds 5 days for your region/)).toBeVisible();

  await page.goto("/shop/cart");
  await expect(page.getByRole("link", { name: "Field Harness" })).toBeVisible();
  await expect(page.getByText("$2 more for free shipping")).toBeVisible();
  await page.getByRole("link", { name: "Check out" }).click();

  await page.getByLabel(/Email for your receipt/).fill("owner@example.com");
  await page.getByRole("button", { name: "Continue to payment" }).click();
  // Without Stripe keys the server refuses to take payment and says so plainly.
  await expect(page.getByText(/Payments aren't switched on in this preview/)).toBeVisible();
});

test("sold-out variants can't be added", async ({ page }) => {
  await page.goto("/shop/products/trail-leash-6ft");
  await page.getByText("Rust").click();
  await expect(page.getByRole("button", { name: "Sold out" })).toBeDisabled();
});

test("customer pages never mention the supplier", async ({ page }) => {
  for (const path of ["/", "/shop", "/shop/products/trail-leash-6ft", "/pro/products/park-station-400"]) {
    await page.goto(path);
    const html = await page.content();
    expect(html).not.toMatch(/aliexpress|alibaba|alicdn/i);
  }
});

test("admin is closed without credentials", async ({ request }) => {
  const res = await request.get("/admin/suppliers");
  expect(res.status()).toBe(401);
});
