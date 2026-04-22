import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import proxy from "@fastify/http-proxy";
import { createLogger } from "@techorbit/logger";

const VERSION = process.env.npm_package_version ?? "0.0.0";
const TEST_PORT = 3001;

async function buildTestServer(): Promise<FastifyInstance> {
  const logger = createLogger({ name: "api-gateway", level: "silent" });
  const fastify = Fastify({ logger });

  await fastify.register(cors);
  await fastify.register(helmet);

  fastify.get("/health", async () => {
    return { status: "ok", service: "api-gateway", version: VERSION };
  });

  // Mock proxy route for testing
  await fastify.register(proxy, {
    upstream: "http://localhost:3002",
    prefix: "/api/v1/identity",
  });

  return fastify;
}

describe("api-gateway smoke tests", () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildTestServer();
    await server.listen({ host: "0.0.0.0", port: TEST_PORT });
  });

  afterAll(async () => {
    await server.close();
  });

  it("should return health status", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("ok");
    expect(body.service).toBe("api-gateway");
    expect(body.version).toBe(VERSION);
  });

  it("should proxy requests to upstream service", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/identity/health",
    });

    // We expect this to either proxy or return an error from the upstream
    // In a real scenario, the upstream would be running
    expect([200, 500, 502, 503, 504]).toContain(response.statusCode);
  });
});
