import { expect, test } from "@playwright/test";

test("visitors see Coming Soon on every page and can join the list", async ({ page }) => {
  for (const path of ["/", "/shop/products/field-harness", "/pro"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: /We know the park/ })).toBeVisible();
  }
  await page.getByText("Gear for my dog").click();
  await page.getByLabel("Email").fill("new-owner@example.com");
  await page.getByRole("button", { name: "Tell me when you open" }).click();
  await expect(page.getByText("You're on the list.")).toBeVisible();
});

test("the team preview password unlocks the full site", async ({ page }) => {
  await page.goto("/preview");
  await page.getByLabel("Preview password").fill("nope-nope-nope");
  await page.getByRole("button", { name: "Open the preview" }).click();
  await expect(page.getByText("That password didn't match.")).toBeVisible();
  await page.getByLabel("Preview password").fill("e2e-preview-pass");
  await page.getByRole("button", { name: "Open the preview" }).click();
  await page.goto("/shop/products/field-harness");
  await expect(page.getByRole("heading", { level: 1, name: "Field Harness" })).toBeVisible();
  await page.goto("/preview/lock");
  await page.goto("/shop");
  await expect(page.getByRole("heading", { level: 1, name: /We know the park/ })).toBeVisible();
});

test("admins can sign in while the site is in Coming Soon mode", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel("Admin password").fill("e2e-admin-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.goto("/admin/signups");
  await expect(page.getByRole("link", { name: "new-owner@example.com" })).toBeVisible();
});
