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

async function registerAndGetRefresh(email: string): Promise<string> {
  const server = await getServer();
  const res = await server.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: { email, password: TEST_PASSWORD, firstName: "R", lastName: "T" },
  });
  const refresh = extractRefreshCookie(res.cookies);
  if (!refresh) throw new Error("register did not set refresh_token cookie");
  return refresh;
}

runIntegrationSuite("POST /api/v1/auth/refresh", () => {
  beforeAll(async () => {
    await getServer();
  });

  afterAll(async () => {
    await closeServer();
  });

  beforeEach(async () => {
    await resetDb();
  });

  it("rotates the refresh token and issues a fresh access token", async () => {
    const oldRefresh = await registerAndGetRefresh("rotate@example.com");
    const server = await getServer();

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: { cookie: cookieHeader(oldRefresh) },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.accessToken).toBeTypeOf("string");

    const newRefresh = extractRefreshCookie(response.cookies);
    expect(newRefresh).toBeTypeOf("string");
    expect(newRefresh).not.toBe(oldRefresh);
  });

  it("revokes all sessions when a used refresh token is replayed", async () => {
    const oldRefresh = await registerAndGetRefresh("replay@example.com");
    const prisma = getPrisma();
    const server = await getServer();

    // Use it once (valid rotation) ...
    const first = await server.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: { cookie: cookieHeader(oldRefresh) },
    });
    expect(first.statusCode).toBe(200);

    // ... then replay the now-revoked one. Must 401, and ALL sessions for
    // that user must be marked revoked (the new rotated session too).
    const replay = await server.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: { cookie: cookieHeader(oldRefresh) },
    });
    expect(replay.statusCode).toBe(401);
    expect(replay.json().error.code).toBe("SESSION_REVOKED");

    const user = await prisma.user.findUnique({ where: { email: "replay@example.com" } });
    const activeSessions = await prisma.session.findMany({
      where: { userId: user!.id, revokedAt: null },
    });
    expect(activeSessions).toHaveLength(0);

    // session.revoked.v1 with REPLAY_DETECTED must be on the outbox.
    const events = await prisma.outgoingEvent.findMany({
      where: { type: "session.revoked.v1" },
    });
    const hasReplayEvent = events.some((e) => {
      const payload = typeof e.payload === "string" ? JSON.parse(e.payload) : e.payload;
      return (payload as { reason?: string }).reason === "REPLAY_DETECTED";
    });
    expect(hasReplayEvent).toBe(true);
  });

  it("401s when no refresh cookie is present", async () => {
    const server = await getServer();
    const response = await server.inject({ method: "POST", url: "/api/v1/auth/refresh" });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("NO_REFRESH_TOKEN");
  });

  it("401s for an unknown refresh token", async () => {
    const server = await getServer();
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: { cookie: cookieHeader("not-a-real-token") },
    });
    expect(response.statusCode).toBe(401);
  });
});
