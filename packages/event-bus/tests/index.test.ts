import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEnvelopeSchema, createEventBus } from "../src/index.ts";

describe("event-bus", () => {
  describe("EventEnvelopeSchema", () => {
    it("should validate a valid envelope", () => {
      const envelope = {
        id: crypto.randomUUID(),
        type: "user.created",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        source: "identity-svc",
        correlationId: crypto.randomUUID(),
        payload: { userId: "123" },
      };

      const result = EventEnvelopeSchema.parse(envelope);
      expect(result.type).toBe("user.created");
    });

    it("should reject invalid envelope", () => {
      const invalidEnvelope = {
        id: "not-a-uuid",
        type: 123,
        version: "1.0.0",
        timestamp: "invalid-date",
        source: "identity-svc",
        payload: {},
      };

      expect(() => EventEnvelopeSchema.parse(invalidEnvelope)).toThrow();
    });
  });

  describe("createEventBus", () => {
    it("should create an event bus instance", () => {
      const bus = createEventBus(
        { url: "amqp://localhost" },
        "test-source"
      );

      expect(bus).toBeDefined();
      expect(typeof bus.connect).toBe("function");
      expect(typeof bus.disconnect).toBe("function");
      expect(typeof bus.publish).toBe("function");
      expect(typeof bus.subscribe).toBe("function");
    });
  });
});