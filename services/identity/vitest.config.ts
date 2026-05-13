import { defineConfig } from "vitest/config";
import projectConfig from "@techorbit/config-vitest/vitest.config.ts";

export default defineConfig({
  ...projectConfig,
  test: {
    ...projectConfig.test,
    include: ["tests/**/*.test.ts"],
    globalSetup: ["./tests/integration/globalSetup.ts"],
    // Integration tests share one Postgres container, so run files serially.
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 60_000,
    hookTimeout: 180_000,
  },
});
