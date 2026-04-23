import { defineConfig } from "vitest/config";
import projectConfig from "@techorbit/config-vitest/vitest.config.ts";

export default defineConfig({
  ...projectConfig,
  test: {
    ...projectConfig.test,
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
  },
});
