import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthContextSchema } from "../src/index.ts";

describe("auth-middleware", () => {
  describe("AuthContextSchema", () => {
    it("should validate a valid auth context", () => {
      const context = {
        userId: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
        roles: ["CANDIDATE", "SRM"],
      };

      const result = AuthContextSchema.parse(context);
      expect(result.userId).toBe(context.userId);
      expect(result.roles).toEqual(["CANDIDATE", "SRM"]);
    });

    it("should reject invalid auth context", () => {
      const invalidContext = {
        userId: "not-a-uuid",
        sessionId: crypto.randomUUID(),
        roles: "CANDIDATE",
      };

      expect(() => AuthContextSchema.parse(invalidContext)).toThrow();
    });

    it("should allow empty roles array", () => {
      const context = {
        userId: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
        roles: [],
      };

      const result = AuthContextSchema.parse(context);
      expect(result.roles).toEqual([]);
    });
  });
});