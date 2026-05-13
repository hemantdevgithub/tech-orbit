import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { TEST_PASSWORD, getPrisma, resetDb, runIntegrationSuite } from "./helpers.js";

/**
 * This file builds its OWN Fastify instance with rate-limiting enabled so
 * the shared server used by other tests stays un-throttled. We also fix the
 * client address so every request inside a test hits the same bucket.
 */
runIntegrationSuite("Rate limiting", () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    delete process.env.DISABLE_RATE_LIMIT;
    const { buildServer } = await import("../../src/server.js");
    server = await buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
    process.env.DISABLE_RATE_LIMIT = "1";
  });

  beforeEach(async () => {
    // Reset the outgoingEvent + user tables; @fastify/rate-limit keeps its
    // own in-memory store that we intentionally leave alone so the limit
    // still triggers within a single test's rapid loop.
    const prisma = getPrisma();
    await prisma.outgoingEvent.deleteMany();
    await resetDb();
  });

  it("blocks login after 5 failed attempts with 429", async () => {
    const ip = "10.99.0.5";
    const statuses: number[] = [];
    for (let i = 0; i < 8; i += 1) {
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: "rl-login@example.com", password: "Wr0ngPassw0rd!" },
        remoteAddress: ip,
      });
      statuses.push(res.statusCode);
    }

    // First 5 attempts hit the handler (401 INVALID_CREDENTIALS); the rest
    // must be rejected by the rate-limit plugin (429).
    expect(statuses.slice(0, 5).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(5).some((s) => s === 429)).toBe(true);
  });

  it("blocks /password/reset/request after 5 attempts with 429", async () => {
    const ip = "10.99.0.6";
    let saw429 = false;
    for (let i = 0; i < 8; i += 1) {
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/auth/password/reset/request",
        payload: { email: `rl-reset-${i}@example.com` },
        remoteAddress: ip,
      });
      if (res.statusCode === 429) {
        saw429 = true;
        break;
      }
    }
    expect(saw429).toBe(true);
  });

  it("blocks /register after 10 attempts with 429", async () => {
    const ip = "10.99.0.7";
    let saw429 = false;
    for (let i = 0; i < 13; i += 1) {
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: `rl-reg-${i}@example.com`,
          password: TEST_PASSWORD,
          firstName: "RL",
          lastName: "User",
        },
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
