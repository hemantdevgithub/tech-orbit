import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import {
  TEST_PASSWORD,
  closeServer,
  cookieHeader,
  extractRefreshCookie,
  getPrisma,
  getServer,
  resetDb,
  runIntegrationSuite,
} from "./helpers.js";

runIntegrationSuite("POST /api/v1/auth/logout", () => {
  beforeAll(async () => {
    await getServer();
  });

  afterAll(async () => {
    await closeServer();
  });

  beforeEach(async () => {
    await resetDb();
  });

  it("revokes the current session and blocks its refresh token", async () => {
    const server = await getServer();
    const reg = await server.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "logout@example.com",
        password: TEST_PASSWORD,
        firstName: "Log",
        lastName: "Out",
      },
    });
    const accessToken = reg.json().accessToken as string;
    const refresh = extractRefreshCookie(reg.cookies)!;

    const logoutRes = await server.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(logoutRes.statusCode).toBe(200);

    // The session must be revoked in the DB.
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { email: "logout@example.com" } });
    const sessions = await prisma.session.findMany({ where: { userId: user!.id } });
    expect(sessions.every((s) => s.revokedAt !== null)).toBe(true);

    // The old refresh token must no longer work.
    const refreshRes = await server.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: { cookie: cookieHeader(refresh) },
    });
    expect(refreshRes.statusCode).toBe(401);
  });

  it("rejects logout without a valid access token", async () => {
    const server = await getServer();
    const response = await server.inject({ method: "POST", url: "/api/v1/auth/logout" });
    expect(response.statusCode).toBe(401);
  });
});
