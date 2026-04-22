import type { PlaywrightConfig } from "@playwright/test";

const config: PlaywrightConfig = {
  testDir: "./tests",
  testMatch: /(.+\.)?(stories|test)\.(js|jsx|mjs|ts|tsx)$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:6006",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm storybook",
    url: "http://localhost:6006",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
};

export default config;