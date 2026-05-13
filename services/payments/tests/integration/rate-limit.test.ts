import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, expect, it } from "vitest";
import { runIntegrationSuite } from "./helpers.js";

/**
 * Builds a dedicated Fastify instance with rate-limiting enabled so the
 * shared server used by other payments integration tests stays un-throttled.
 * Auth runs as a preHandler; rate-limit runs earlier (onRequest), so
 * unauthenticated requests still get counted and eventually 429.
 */
runIntegrationSuite("Rate limiting", () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    // z.coerce.boolean() returns true for any non-empty string — including "0".
    // Deleting the var is the only way to get the zod default of false here.
    delete process.env.DISABLE_RATE_LIMIT;
    const { clearConfigCache } = await import("../../src/config.js");
    clearConfigCache();
    const { buildServer } = await import("../../src/server.js");
    server = await buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
    process.env.DISABLE_RATE_LIMIT = "1";
    const { clearConfigCache } = await import("../../src/config.js");
    clearConfigCache();
  });

  it("blocks POST /invoices/:id/mark-paid after 30/min with 429", async () => {
    const ip = "10.77.0.1";
    const id = "00000000-0000-0000-0000-0000000000aa";
    let saw429 = false;
    for (let i = 0; i < 40; i += 1) {
      const res = await server.inject({
        method: "POST",
        url: `/api/v1/invoices/${id}/mark-paid`,
        remoteAddress: ip,
      });
      if (res.statusCode === 429) {
        saw429 = true;
        break;
      }
    }
    expect(saw429).toBe(true);
  });

  it("blocks POST /timesheets after 60/min with 429", async () => {
    const ip = "10.77.0.2";
    let saw429 = false;
    for (let i = 0; i < 75; i += 1) {
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/timesheets",
        payload: {},
        remoteAddress: ip,
      });
      if (res.statusCode === 429) {
        saw429 = true;
        break;
      }
    }
    expect(saw429).toBe(true);
  });
});
