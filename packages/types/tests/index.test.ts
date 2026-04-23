import { describe, it, expect } from "vitest";
import {
  UserRoleType,
  WorkAuthStatus,
  CandidateStatus,
  RequirementStatus,
  InterviewStatus,
  PlacementStatus,
  PaymentStatus,
  NotificationType,
  RatingType,
} from "../src/index.ts";

describe("types", () => {
  describe("UserRoleType", () => {
    it("should validate valid roles", () => {
      const validRoles = [
        "CUSTOMER",
        "CRM",
        "SRM",
        "CANDIDATE",
        "MSME",
        "INTERVIEWER",
        "ADMIN",
      ] as const;
      for (const role of validRoles) {
        expect(UserRoleType.parse(role)).toBe(role);
      }
    });

    it("should reject invalid roles", () => {
      expect(() => UserRoleType.parse("INVALID")).toThrow();
    });
  });

  describe("WorkAuthStatus", () => {
    it("should validate all work auth statuses", () => {
      const statuses = [
        "US_CITIZEN",
        "GREEN_CARD",
        "H1B",
        "L1",
        "OPT",
        "CPT",
        "TN",
        "OTHER",
      ] as const;
      for (const status of statuses) {
        expect(WorkAuthStatus.parse(status)).toBe(status);
      }
    });
  });

  describe("CandidateStatus", () => {
    it("should validate all candidate statuses", () => {
      const statuses = [
        "DRAFT",
        "SUBMITTED",
        "IN_REVIEW",
        "INTERVIEWING",
        "OFFER_EXTENDED",
        "HIRED",
        "REJECTED",
        "WITHDRAWN",
      ] as const;
      for (const status of statuses) {
        expect(CandidateStatus.parse(status)).toBe(status);
      }
    });
  });

  describe("RequirementStatus", () => {
    it("should validate all requirement statuses", () => {
      const statuses = [
        "DRAFT",
        "OPEN",
        "INTERVIEWING",
        "OFFER_EXTENDED",
        "PLACED",
        "CLOSED",
        "CANCELLED",
      ] as const;
      for (const status of statuses) {
        expect(RequirementStatus.parse(status)).toBe(status);
      }
    });
  });

  describe("InterviewStatus", () => {
    it("should validate all interview statuses", () => {
      const statuses = [
        "SCHEDULED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
        "NO_SHOW",
      ] as const;
      for (const status of statuses) {
        expect(InterviewStatus.parse(status)).toBe(status);
      }
    });
  });

  describe("PlacementStatus", () => {
    it("should validate all placement statuses", () => {
      const statuses = ["PROBATION", "ACTIVE", "PAUSED", "TERMINATED"] as const;
      for (const status of statuses) {
        expect(PlacementStatus.parse(status)).toBe(status);
      }
    });
  });

  describe("PaymentStatus", () => {
    it("should validate all payment statuses", () => {
      const statuses = [
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
        "REFUNDED",
      ] as const;
      for (const status of statuses) {
        expect(PaymentStatus.parse(status)).toBe(status);
      }
    });
  });

  describe("NotificationType", () => {
    it("should validate all notification types", () => {
      const types = ["EMAIL", "SMS", "PUSH", "IN_APP"] as const;
      for (const type of types) {
        expect(NotificationType.parse(type)).toBe(type);
      }
    });
  });

  describe("RatingType", () => {
    it("should validate all rating types", () => {
      const types = ["INTERVIEW", "PLACEMENT", "SRM", "MSME"] as const;
      for (const type of types) {
        expect(RatingType.parse(type)).toBe(type);
      }
    });
  });
});