import { authenticator } from "otplib";
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

async function registerAndLogin(email: string): Promise<string> {
  const server = await getServer();
  const res = await server.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: { email, password: TEST_PASSWORD, firstName: "Two", lastName: "Fa" },
  });
  return res.json().accessToken as string;
}

runIntegrationSuite("2FA setup and login flows", () => {
  beforeAll(async () => {
    await getServer();
  });

  afterAll(async () => {
    await closeServer();
  });

  beforeEach(async () => {
    await resetDb();
  });

  it("setup returns a QR data URL, secret, and backup codes", async () => {
    const accessToken = await registerAndLogin("twofa-setup@example.com");
    const server = await getServer();

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/2fa/setup",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.secret).toBeTypeOf("string");
    expect(body.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(Array.isArray(body.backupCodes)).toBe(true);
    expect(body.backupCodes.length).toBeGreaterThanOrEqual(6);
  });

  it("verifies a valid TOTP code after setup, rejects an invalid one", async () => {
    const accessToken = await registerAndLogin("twofa-verify@example.com");
    const server = await getServer();

    const setup = await server.inject({
      method: "POST",
      url: "/api/v1/auth/2fa/setup",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const secret = setup.json().secret as string;
    const validCode = authenticator.generate(secret);

    const verify = await server.inject({
      method: "POST",
      url: "/api/v1/auth/2fa/verify",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { code: validCode },
    });
    expect(verify.statusCode).toBe(200);

    const bad = await server.inject({
      method: "POST",
      url: "/api/v1/auth/2fa/verify",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { code: "000000" },
    });
    expect(bad.statusCode).toBe(401);
    expect(bad.json().error.code).toBe("INVALID_CODE");
  });

  it("exchanges a valid challenge token + TOTP for an access token", async () => {
    const server = await getServer();
    // Register + set up 2FA
    const reg = await server.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "twofa-login@example.com",
        password: TEST_PASSWORD,
        firstName: "T",
        lastName: "F",
      },
    });
    const firstAccess = reg.json().accessToken as string;
    const setup = await server.inject({
      method: "POST",
      url: "/api/v1/auth/2fa/setup",
      headers: { authorization: `Bearer ${firstAccess}` },
    });
    const secret = setup.json().secret as string;

    // Login now returns a challenge (not an access token)
    const login = await server.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "twofa-login@example.com", password: TEST_PASSWORD },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json().require2FA).toBe(true);
    const challengeToken = login.json().challengeToken as string;

    // Exchange challenge + TOTP for a real access token
    const code = authenticator.generate(secret);
    const verify = await server.inject({
      method: "POST",
      url: "/api/v1/auth/2fa/verify",
      payload: { challengeToken, code },
    });

    expect(verify.statusCode).toBe(200);
    expect(verify.json().accessToken).toBeTypeOf("string");
    expect(extractRefreshCookie(verify.cookies)).toBeTypeOf("string");
  });

  it("rejects an invalid challenge token", async () => {
    const server = await getServer();
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/2fa/verify",
      payload: { challengeToken: "not-a-jwt", code: "123456" },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("INVALID_CHALLENGE");
  });

  it("stores the 2FA secret on the user after setup", async () => {
    const accessToken = await registerAndLogin("twofa-persist@example.com");
    const server = await getServer();

    await server.inject({
      method: "POST",
      url: "/api/v1/auth/2fa/setup",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { email: "twofa-persist@example.com" } });
    expect(user?.has2FA).toBe(true);
    // Secret is stored encrypted, not as plaintext
    const enc = user?.twoFASecretEncrypted as Record<string, unknown> | null;
    expect(enc).not.toBeNull();
    expect(enc?.ciphertext).toBeTypeOf("string");
    expect(enc?.iv).toBeTypeOf("string");
    expect(enc?.authTag).toBeTypeOf("string");
    expect(enc?.keyId).toBe("v1");
  });
});
