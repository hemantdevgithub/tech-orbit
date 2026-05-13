import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import {
  TEST_PASSWORD,
  closeServer,
  extractRefreshCookie,
  getServer,
  resetDb,
  runIntegrationSuite,
} from "./helpers.js";

runIntegrationSuite("POST /api/v1/auth/register", () => {
  beforeAll(async () => {
    await getServer();
  });

  afterAll(async () => {
    await closeServer();
  });

  beforeEach(async () => {
    await resetDb();
  });

  it("creates a user and returns access + refresh tokens on the happy path", async () => {
    const server = await getServer();
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "alice@example.com",
        password: TEST_PASSWORD,
        firstName: "Alice",
        lastName: "Example",
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toMatchObject({
      message: "Registration successful",
      tokenType: "Bearer",
      require2FA: false,
    });
    expect(body.accessToken).toBeTypeOf("string");
    expect(extractRefreshCookie(response.cookies)).toBeTypeOf("string");
  });

  it("returns the same 201 shape for duplicate email (no enumeration leak)", async () => {
    const server = await getServer();
    const payload = {
      email: "dup@example.com",
      password: TEST_PASSWORD,
      firstName: "First",
      lastName: "User",
    };

    const first = await server.inject({ method: "POST", url: "/api/v1/auth/register", payload });
    expect(first.statusCode).toBe(201);

    const second = await server.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { ...payload, firstName: "Second" },
    });

    // Same status code + same top-level "message" keeps the response shape
    // identical between "email is new" and "email is taken".
    expect(second.statusCode).toBe(201);
    const body = second.json();
    expect(body.message).toBe("Registration successful");
  });

  it("rejects a weak password with WEAK_PASSWORD", async () => {
    const server = await getServer();
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "weak@example.com",
        password: "password1234",
        firstName: "Weak",
        lastName: "Password",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("WEAK_PASSWORD");
  });

  it("rejects a password shorter than 12 characters", async () => {
    const server = await getServer();
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "short@example.com",
        password: "Sh0rt!",
        firstName: "Short",
        lastName: "Password",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("WEAK_PASSWORD");
  });

  it("rejects when required fields are missing", async () => {
    const server = await getServer();
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email: "incomplete@example.com" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });
});
