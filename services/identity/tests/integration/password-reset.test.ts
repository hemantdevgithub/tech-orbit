import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi, type MockInstance } from "vitest";
import {
  TEST_PASSWORD,
  closeServer,
  getPrisma,
  getServer,
  resetDb,
  runIntegrationSuite,
} from "./helpers.js";

async function registerUser(email: string): Promise<void> {
  const server = await getServer();
  await server.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: { email, password: TEST_PASSWORD, firstName: "Reset", lastName: "User" },
  });
}

/**
 * Grab the plaintext reset token emitted by passwordResetService in dev mode.
 * The service does: `console.log("[DEV] Password reset token for ${email}: ${token}")`.
 * We spy on console.log and pull the token out. This is a test-only hook; the
 * production path sends via SMTP instead.
 */
function captureResetToken(spy: MockInstance, email: string): string | undefined {
  for (const call of spy.mock.calls as unknown[][]) {
    const message = call[0];
    if (typeof message === "string" && message.includes(`[DEV] Password reset token for ${email}`)) {
      const match = message.match(/: ([a-f0-9]+)$/);
      if (match) return match[1];
    }
  }
  return undefined;
}

runIntegrationSuite("Password reset flow", () => {
  let logSpy: MockInstance;

  beforeAll(async () => {
    await getServer();
  });

  afterAll(async () => {
    await closeServer();
  });

  beforeEach(async () => {
    await resetDb();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("always returns 200 on /request, even for a non-existent email", async () => {
    const server = await getServer();
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/password/reset/request",
      payload: { email: "nonexistent@example.com" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().message).toContain("reset link has been sent");
  });

  it("completes the happy-path request -> confirm flow", async () => {
    const email = "reset-happy@example.com";
    await registerUser(email);
    const server = await getServer();

    await server.inject({
      method: "POST",
      url: "/api/v1/auth/password/reset/request",
      payload: { email },
    });

    const token = captureResetToken(logSpy, email);
    expect(token).toBeTypeOf("string");

    const newPassword = "F7!xedPassw0rdAnchor2";
    const confirm = await server.inject({
      method: "POST",
      url: "/api/v1/auth/password/reset/confirm",
      payload: { token, password: newPassword },
    });
    expect(confirm.statusCode).toBe(200);

    // New password should now work for login
    const login = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email, password: newPassword },
    });
    expect(login.statusCode).toBe(200);
  });

  it("rejects a reused reset token on a second /confirm", async () => {
    const email = "reset-reuse@example.com";
    await registerUser(email);
    const server = await getServer();
    await server.inject({
      method: "POST",
      url: "/api/v1/auth/password/reset/request",
      payload: { email },
    });

    const token = captureResetToken(logSpy, email)!;
    const strongPw = "Str0ng!RepeatWard3n";
    const first = await server.inject({
      method: "POST",
      url: "/api/v1/auth/password/reset/confirm",
      payload: { token, password: strongPw },
    });
    expect(first.statusCode).toBe(200);

    const second = await server.inject({
      method: "POST",
      url: "/api/v1/auth/password/reset/confirm",
      payload: { token, password: strongPw },
    });
    expect(second.statusCode).toBe(400);
    expect(second.json().error.code).toBe("INVALID_TOKEN");
  });

  it("rejects an expired reset token", async () => {
    const email = "reset-expired@example.com";
    await registerUser(email);
    const server = await getServer();
    await server.inject({
      method: "POST",
      url: "/api/v1/auth/password/reset/request",
      payload: { email },
    });

    const token = captureResetToken(logSpy, email)!;
    const prisma = getPrisma();
    // Push expiry into the past.
    await prisma.passwordResetRequest.updateMany({
      where: {},
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/password/reset/confirm",
      payload: { token, password: "Another!Pw0rd1234" },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_TOKEN");
  });

  it("rejects a bogus reset token", async () => {
    const server = await getServer();
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/password/reset/confirm",
      payload: { token: "not-a-real-token", password: "Another!Pw0rd1234" },
    });
    expect(response.statusCode).toBe(400);
  });
});
