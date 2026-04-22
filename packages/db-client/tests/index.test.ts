import { describe, it, expect } from "vitest";
import { DbClientConfigSchema } from "../src/index.ts";

describe("db-client", () => {
  describe("DbClientConfigSchema", () => {
    it("should validate a valid config", () => {
      const config = {
        url: "postgresql://localhost:5432/techorbit",
        schema: "identity",
      };

      const result = DbClientConfigSchema.parse(config);
      expect(result.url).toBe(config.url);
      expect(result.schema).toBe("identity");
    });

    it("should validate config without schema", () => {
      const config = {
        url: "postgresql://localhost:5432/techorbit",
      };

      const result = DbClientConfigSchema.parse(config);
      expect(result.schema).toBeUndefined();
    });

    it("should reject invalid url", () => {
      const config = {
        url: "not-a-url",
      };

      expect(() => DbClientConfigSchema.parse(config)).toThrow();
    });

    it("should reject missing url", () => {
      const config = {
        schema: "identity",
      };

      expect(() => DbClientConfigSchema.parse(config)).toThrow();
    });
  });
});