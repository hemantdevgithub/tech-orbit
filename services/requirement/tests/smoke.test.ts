import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { generateKeyPairSync } from "node:crypto";

// buildServer reads config eagerly, so provide the minimum required env.
// Smoke test never hits the DB; a placeholder URL is fine.
const { publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});
process.env.JWT_PUBLIC_KEY = publicKey;
process.env.DATABASE_URL = "postgresql://unused:unused@localhost:5432/unused";
process.env.DISABLE_RATE_LIMIT = "1";

const { buildServer } = await import("../src/server.js");

describe("requirement smoke tests", () => {
  let server: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    server = await buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it("should return health status", async () => {
    const response = await server.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("ok");
    expect(body.service).toBe("requirement-svc");
  });
});
