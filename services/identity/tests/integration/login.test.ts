import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import {
  TEST_PASSWORD,
  closeServer,
  extractRefreshCookie,
  getPrisma,
  getServer,
  resetDb,
  runIntegrationSuite,
} from "./helpers.js";

async function registerUser(email: string): Promise<void> {
  const server = await getServer();
  const res = await server.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: { email, password: TEST_PASSWORD, firstName: "Test", lastName: "User" },
  });
  if (res.statusCode !== 201) {
    throw new Error(`registerUser failed: ${res.statusCode} ${res.body}`);
  }
}

runIntegrationSuite("POST /api/v1/auth/login", () => {
  beforeAll(async () => {
    await getServer();
  });

  afterAll(async () => {
    await closeServer();
  });

  beforeEach(async () => {
    await resetDb();
  });

  it("issues access token + refresh cookie on valid credentials", async () => {
    await registerUser("login-happy@example.com");
    const server = await getServer();

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "login-happy@example.com", password: TEST_PASSWORD },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.accessToken).toBeTypeOf("string");
    expect(body.tokenType).toBe("Bearer");
    expect(extractRefreshCookie(response.cookies)).toBeTypeOf("string");
  });

  it("returns INVALID_CREDENTIALS for wrong password", async () => {
    await registerUser("wrong-pw@example.com");
    const server = await getServer();

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "wrong-pw@example.com", password: "WrongPassword1234!" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("INVALID_CREDENTIALS");
  });

  it("returns the same INVALID_CREDENTIALS for a non-existent user", async () => {
    const server = await getServer();
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "ghost@example.com", password: TEST_PASSWORD },
    });

    // Enumeration prevention: identical status + error code to wrong-password case.
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("INVALID_CREDENTIALS");
  });

  it("blocks suspended accounts", async () => {
    await registerUser("suspended@example.com");
    const prisma = getPrisma();
    await prisma.user.update({
      where: { email: "suspended@example.com" },
      data: { status: "SUSPENDED" },
    });

    const server = await getServer();
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "suspended@example.com", password: TEST_PASSWORD },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("INVALID_CREDENTIALS");
  });

  it("returns a 2FA challenge (not an access token) for 2FA-enabled accounts", async () => {
    await registerUser("twofa@example.com");
    const prisma = getPrisma();
    // Enable 2FA directly in the DB. Login only checks the has2FA flag; it
    // doesn't read the secret (that happens at TOTP verify time), so we don't
    // need a real encrypted value here.
    await prisma.user.update({
      where: { email: "twofa@example.com" },
      data: { has2FA: true },
    });

    const server = await getServer();
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "twofa@example.com", password: TEST_PASSWORD },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.require2FA).toBe(true);
    expect(body.challengeToken).toBeTypeOf("string");
    expect(body.accessToken).toBeUndefined();
    // No refresh cookie should be set until 2FA is verified.
    expect(extractRefreshCookie(response.cookies)).toBeUndefined();
  });

  it("rejects malformed input with VALIDATION_ERROR", async () => {
    const server = await getServer();
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });
});
