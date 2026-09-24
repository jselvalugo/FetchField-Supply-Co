import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3200);
const SOON_PORT = PORT + 1;
const common = { ADMIN_PASSWORD: "e2e-admin-password", STRIPE_WEBHOOK_SECRET: "whsec_e2e", PREVIEW_PASSWORD: "e2e-preview-pass" };

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", testIgnore: /launch\.spec/, use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", testIgnore: /(launch|admin)\.spec/, use: { ...devices["Pixel 7"] } },
    { name: "coming-soon", testMatch: /launch\.spec/, use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${SOON_PORT}` } },
  ],
  webServer: [
    { command: `rm -rf .data-e2e && npx next start -p ${PORT}`, port: PORT, reuseExistingServer: false, env: { ...common, FF_DATA_DIR: ".data-e2e" } },
    { command: `rm -rf .data-e2e-soon && npx next start -p ${SOON_PORT}`, port: SOON_PORT, reuseExistingServer: false, env: { ...common, FF_DATA_DIR: ".data-e2e-soon", COMING_SOON: "1" } },
  ],
});
