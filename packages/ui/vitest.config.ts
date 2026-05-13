import { defineConfig } from "vitest/config";

export default defineConfig({
  extends: "@techorbit/config-vitest",
  test: {
    environment: "jsdom",
    setupFiles: [],
  },
});