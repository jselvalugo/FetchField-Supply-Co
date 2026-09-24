import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Admin password").fill("wrong-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("That password didn't match.")).toBeVisible();
  await page.getByLabel("Admin password").fill("e2e-admin-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test("quotes submitted on the site show up in the admin", async ({ page }) => {
  await page.goto("/pro/products/rules-sign-18x24");
  await page.getByRole("button", { name: "Add to quote" }).click();
  await page.goto("/pro/quote");
  await page.getByLabel("Organization name").fill("Riverside Parks District");
  await page.getByLabel("Organization type").selectOption("parks");
  await page.getByLabel("Your name").fill("Pat Lee");
  await page.getByLabel("Email").fill("pat@riverside.example");
  await page.getByLabel("Delivery ZIP").fill("98101");
  await page.getByRole("button", { name: "Submit quote request" }).click();
  const ref = (await page.getByText(/FFQ-\d{6}-[0-9A-F]{6}/).first().textContent())!.match(/FFQ-\d{6}-[0-9A-F]{6}/)![0];

  await signIn(page);
  await page.getByRole("link", { name: /^Quotes/ }).click();
  await page.getByRole("link", { name: ref }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Riverside Parks District" })).toBeVisible();
  await page.getByLabel("Status").selectOption("reviewing");
  await page.getByLabel(/Internal note/).fill("Needs freight to Seattle yard");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await expect(page.getByText("Status → reviewing")).toBeVisible();
});

test("paid Stripe orders are recorded once and trackable by the customer", async ({ page, request }) => {
  const body = JSON.stringify({
    type: "checkout.session.completed",
    data: { object: { id: "cs_test_e2e1", payment_status: "paid", customer_details: { email: "jo@example.com" },
      collected_information: { shipping_details: { name: "Jo Rivera", address: { line1: "1 Elm St", city: "Denver", state: "CO", postal_code: "80202" } } },
      amount_subtotal: 3400, amount_total: 4095, total_details: { amount_shipping: 695, amount_tax: 0 }, metadata: { order: "FF-222333" } } },
  });
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", "whsec_e2e").update(`${t}.${body}`).digest("hex");
  const send = () => request.post("/api/stripe/webhook", { data: body, headers: { "stripe-signature": `t=${t},v1=${sig}`, "content-type": "application/json" } });
  expect((await (await send()).json()).order).toBe("FF-222333");
  expect((await (await send()).json()).duplicate).toBe(true);
  const forged = await request.post("/api/stripe/webhook", { data: body, headers: { "stripe-signature": `t=${t},v1=${"0".repeat(64)}` } });
  expect(forged.status()).toBe(400);

  await signIn(page);
  await page.goto("/admin/orders/FF-222333");
  await page.getByLabel("Status").selectOption("shipped");
  await page.getByLabel("Carrier").fill("USPS");
  await page.getByLabel("Tracking number").fill("9400111899223");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(/Saved\. The customer's tracking page/)).toBeVisible();

  await page.goto("/shop/track");
  await page.getByLabel("Order number").fill("FF-222333");
  await page.getByLabel("Shipping ZIP").fill("99999");
  await page.getByRole("button", { name: "Find order" }).click();
  await expect(page.getByText("We couldn't find that order")).toBeVisible();
  await page.getByLabel("Shipping ZIP").fill("80202");
  await page.getByRole("button", { name: "Find order" }).click();
  await expect(page.getByText("It's on the way.")).toBeVisible();
  await expect(page.getByText("9400111899223")).toBeVisible();
});

test("price, stock and visibility edits reach the storefront", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/products/shop/tug-rope");
  await page.getByLabel("Price (USD)").fill("15.50");
  await page.getByLabel(/Was price/).fill("12.00");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(/must be higher than the price/)).toBeVisible();

  await page.getByLabel(/Was price/).fill("");
  await page.getByLabel("Price (USD)").fill("15.50");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(/Saved\. The live site updates/)).toBeVisible();
  await expect.poll(async () => (await (await page.request.get("/shop/products/tug-rope")).text()).includes("$15.50"), { timeout: 10_000 }).toBe(true);

  await page.goto("/admin/products/shop/tug-rope");
  await page.getByLabel(/Visible on the site/).uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  // Pages refresh a moment after a save.
  await expect.poll(async () => (await page.request.get("/shop/products/tug-rope")).status(), { timeout: 10_000 }).toBe(404);

  await page.goto("/admin/products/shop/tug-rope");
  await page.getByRole("button", { name: "Reset to catalog defaults" }).click();
  await expect.poll(async () => (await page.request.get("/shop/products/tug-rope")).status(), { timeout: 10_000 }).toBe(200);
});

test("signups export as CSV; bad emails are refused at the door", async ({ page, request }) => {
  const bad = await request.post("/api/launch-list", { data: { email: "=HYPERLINK(1)@evil.example", audience: "dog" } });
  expect(bad.status()).toBe(400);
  await request.post("/api/launch-list", { data: { email: "ann@example.com", audience: "parks" } });
  await signIn(page);
  await page.goto("/admin/signups");
  await expect(page.getByRole("link", { name: "ann@example.com" })).toBeVisible();
  const csv = await (await page.request.get("/admin/signups/export")).text();
  expect(csv.split("\r\n")[0]).toBe("email,interested_in,joined_at,source");
  expect(csv).toContain('"ann@example.com","parks"');
  expect(csv).not.toContain("HYPERLINK");
  const anon = await request.get("/admin/signups/export", { maxRedirects: 0 });
  expect([303, 404]).toContain(anon.status());
});
