import { defineConfig, devices } from "@playwright/test";

/**
 * Techorbit web E2E configuration.
 *
 * Assumes the full stack (identity-svc, web, Postgres, etc.) is already
 * running via `pnpm dev` / `docker-compose up -d`. Install browsers once:
 *
 *   pnpm --filter @techorbit/web exec playwright install --with-deps
 *
 * Then run:
 *
 *   pnpm --filter @techorbit/web e2e
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
