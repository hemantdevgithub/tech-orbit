import { describe, it, expect } from "vitest";
import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  InternalError,
  isAppError,
} from "../src/index.ts";

describe("errors", () => {
  describe("AppError", () => {
    it("should create an error with correct properties", () => {
      const error = new AppError({
        code: "TEST_ERROR",
        message: "Test message",
        statusCode: 400,
      });

      expect(error.code).toBe("TEST_ERROR");
      expect(error.message).toBe("Test message");
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe("AppError");
    });

    it("should serialize to JSON correctly", () => {
      const error = new AppError({
        code: "TEST_ERROR",
        message: "Test message",
        statusCode: 400,
        details: { field: "value" },
      });

      const json = error.toJSON();

      expect(json.error.code).toBe("TEST_ERROR");
      expect(json.error.message).toBe("Test message");
      expect(json.error.details).toEqual({ field: "value" });
    });
  });

  describe("NotFoundError", () => {
    it("should create a 404 error", () => {
      const error = new NotFoundError("Resource not found");

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe("NOT_FOUND");
      expect(error.message).toBe("Resource not found");
    });
  });

  describe("ValidationError", () => {
    it("should create a 400 error", () => {
      const error = new ValidationError("Invalid input");

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("UnauthorizedError", () => {
    it("should create a 401 error", () => {
      const error = new UnauthorizedError();

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.message).toBe("Unauthorized");
    });
  });

  describe("ForbiddenError", () => {
    it("should create a 403 error", () => {
      const error = new ForbiddenError();

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe("FORBIDDEN");
    });
  });

  describe("ConflictError", () => {
    it("should create a 409 error", () => {
      const error = new ConflictError("Resource already exists");

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe("CONFLICT");
    });
  });

  describe("InternalError", () => {
    it("should create a 500 error", () => {
      const error = new InternalError();

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe("INTERNAL_ERROR");
      expect(error.message).toBe("Internal server error");
    });
  });

  describe("isAppError", () => {
    it("should return true for AppError instances", () => {
      expect(isAppError(new NotFoundError("test"))).toBe(true);
      expect(isAppError(new ValidationError("test"))).toBe(true);
    });

    it("should return false for regular errors", () => {
      expect(isAppError(new Error("test"))).toBe(false);
      expect(isAppError({ message: "test" })).toBe(false);
    });
  });
});