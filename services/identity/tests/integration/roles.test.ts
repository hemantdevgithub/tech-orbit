import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import {
  TEST_PASSWORD,
  closeServer,
  getServer,
  resetDb,
  runIntegrationSuite,
} from "./helpers.js";

async function registerAndAuth(email: string): Promise<string> {
  const server = await getServer();
  const res = await server.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: { email, password: TEST_PASSWORD, firstName: "Role", lastName: "Tester" },
  });
  return res.json().accessToken as string;
}

runIntegrationSuite("POST /api/v1/me/roles", () => {
  beforeAll(async () => {
    await getServer();
  });

  afterAll(async () => {
    await closeServer();
  });

  beforeEach(async () => {
    await resetDb();
  });

  it.each([
    ["CUSTOMER", "ACTIVE"],
    ["CANDIDATE", "ACTIVE"],
    ["CRM", "PENDING_VERIFICATION"],
    ["SRM", "PENDING_VERIFICATION"],
    ["MSME", "PENDING_VERIFICATION"],
    ["INTERVIEWER", "PENDING_VERIFICATION"],
  ])("role %s starts as %s", async (roleType, expectedStatus) => {
    const token = await registerAndAuth(`${roleType.toLowerCase()}@example.com`);
    const server = await getServer();

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/me/roles",
      headers: { authorization: `Bearer ${token}` },
      payload: { roleType },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.roleType).toBe(roleType);
    expect(body.status).toBe(expectedStatus);
  });

  it("rejects an invalid role type", async () => {
    const token = await registerAndAuth("invalidrole@example.com");
    const server = await getServer();
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/me/roles",
      headers: { authorization: `Bearer ${token}` },
      payload: { roleType: "WIZARD" },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_ROLE");
  });

  it("requires authentication", async () => {
    const server = await getServer();
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/me/roles",
      payload: { roleType: "CUSTOMER" },
    });
    expect(response.statusCode).toBe(401);
  });
});
