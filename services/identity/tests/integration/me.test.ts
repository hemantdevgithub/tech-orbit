import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import {
  TEST_PASSWORD,
  closeServer,
  getServer,
  resetDb,
  runIntegrationSuite,
} from "./helpers.js";

runIntegrationSuite("GET /api/v1/me", () => {
  beforeAll(async () => {
    await getServer();
  });

  afterAll(async () => {
    await closeServer();
  });

  beforeEach(async () => {
    await resetDb();
  });

  it("returns the authenticated user's profile", async () => {
    const server = await getServer();
    const reg = await server.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "me@example.com",
        password: TEST_PASSWORD,
        firstName: "Me",
        lastName: "Myself",
      },
    });
    const accessToken = reg.json().accessToken as string;

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.email).toBe("me@example.com");
    expect(body.firstName).toBe("Me");
    expect(body.has2FA).toBe(false);
    expect(Array.isArray(body.roles)).toBe(true);
    expect(Array.isArray(body.sessions)).toBe(true);
    expect(body.sessions.length).toBeGreaterThan(0);
  });

  it("401s without a token", async () => {
    const server = await getServer();
    const response = await server.inject({ method: "GET", url: "/api/v1/me" });
    expect(response.statusCode).toBe(401);
  });
});
