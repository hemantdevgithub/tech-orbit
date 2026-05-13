import { describe, it, expect, vi } from "vitest";
import { createLogger, redactSecrets } from "../src/index.ts";

describe("logger", () => {
  describe("createLogger", () => {
    it("should create a logger with name", () => {
      const logger = createLogger({ name: "test-service" });
      expect(logger).toBeDefined();
      expect(logger.bindings().service).toBe("test-service");
    });

    it("should create a logger with custom level", () => {
      const logger = createLogger({ name: "test", level: "debug" });
      expect(logger.level).toBe("debug");
    });
  });

  describe("redactSecrets", () => {
    it("should redact sensitive fields", () => {
      const input = {
        userId: "123",
        password: "secret123",
        token: "abc123",
        email: "test@example.com",
      };

      const result = redactSecrets(input);

      expect(result.userId).toBe("123");
      expect(result.password).toBe("[REDACTED]");
      expect(result.token).toBe("[REDACTED]");
      expect(result.email).toBe("test@example.com");
    });

    it("should redact nested sensitive fields", () => {
      const input = {
        user: {
          name: "John",
          ssn: "123-45-6789",
        },
      };

      const result = redactSecrets(input) as { user: { name: string; ssn: string } };

      expect(result.user.name).toBe("John");
      expect(result.user.ssn).toBe("[REDACTED]");
    });

    it("should handle null and undefined values", () => {
      const input = {
        token: null,
        secret: undefined,
      };

      const result = redactSecrets(input);

      expect(result.token).toBe("[REDACTED]");
      expect(result.secret).toBe("[REDACTED]");
    });
  });
});