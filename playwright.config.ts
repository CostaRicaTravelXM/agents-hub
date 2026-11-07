import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against the local stack (Supabase + RustFS + Next).
 *   npm run db:reset && npm run seed && npm run test:e2e
 * Uses the installed Chrome (PW_CHANNEL=chromium to use Playwright's own build).
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    channel: process.env.PW_WEBKIT ? undefined : (process.env.PW_CHANNEL ?? "chrome"),
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], channel: process.env.PW_CHANNEL ?? "chrome", viewport: { width: 1440, height: 900 } },
      testIgnore: /(mobile|reader-mobile)\.spec\.ts/,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], channel: process.env.PW_CHANNEL ?? "chrome" },
      testMatch: /(mobile|reader-mobile)\.spec\.ts/,
    },
    // Real iPad Safari engine, on request: PW_WEBKIT=1 after `npx playwright install webkit`.
    ...(process.env.PW_WEBKIT
      ? [{ name: "tablet-safari", use: { ...devices["iPad (gen 7) landscape"], channel: undefined }, testMatch: /reader\.spec\.ts/ }]
      : []),
    {
      name: "tablet",
      use: { ...devices["iPad (gen 7)"], browserName: "chromium", channel: process.env.PW_CHANNEL ?? "chrome" },
      testMatch: /reader-mobile\.spec\.ts/,
    },
    {
      name: "tablet-landscape",
      use: { ...devices["iPad (gen 7) landscape"], browserName: "chromium", channel: process.env.PW_CHANNEL ?? "chrome" },
      testMatch: /reader\.spec\.ts/,
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
