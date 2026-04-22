import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { closeServer, getServer, resetDb, runIntegrationSuite } from "./helpers.js";

/**
 * End-to-end OAuth with Google/LinkedIn requires stubbing the provider's
 * token + userinfo endpoints, which is out of scope for this sprint. These
 * tests lock in the /start redirect behavior and the callback input
 * validation — the deepest flows (new-user vs existing-user linking) are
 * covered by oauth.service.ts unit tests and the Playwright flow.
 */
runIntegrationSuite("OAuth routes", () => {
  beforeAll(async () => {
    await getServer();
  });

  afterAll(async () => {
    await closeServer();
  });

  beforeEach(async () => {
    await resetDb();
  });

  it("Google /start returns 500 when GOOGLE_CLIENT_ID is not configured", async () => {
    const original = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;
    try {
      const server = await getServer();
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/auth/oauth/google/start",
      });
      expect(response.statusCode).toBe(500);
      expect(response.json().error.code).toBe("OAUTH_NOT_CONFIGURED");
    } finally {
      if (original) process.env.GOOGLE_CLIENT_ID = original;
    }
  });

  it("Google /start redirects to accounts.google.com when configured", async () => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3002/api/v1/auth/oauth/google/callback";
    const server = await getServer();
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/auth/oauth/google/start",
    });
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain("accounts.google.com");
  });

  it("Google /callback rejects missing code/state with INVALID_CALLBACK", async () => {
    const server = await getServer();
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/auth/oauth/google/callback",
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_CALLBACK");
  });

  it("Google /callback rejects an unknown state with INVALID_STATE", async () => {
    const server = await getServer();
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/auth/oauth/google/callback?code=abc&state=never-issued",
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_STATE");
  });

  it("LinkedIn /start redirects to linkedin.com when configured", async () => {
    process.env.LINKEDIN_CLIENT_ID = "test-client-id";
    process.env.LINKEDIN_REDIRECT_URI = "http://localhost:3002/api/v1/auth/oauth/linkedin/callback";
    const server = await getServer();
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/auth/oauth/linkedin/start",
    });
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain("linkedin.com");
  });
});
