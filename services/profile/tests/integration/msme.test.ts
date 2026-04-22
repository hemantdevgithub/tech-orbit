import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { runIntegrationSuite, getServer, closeServer, resetDb, makeBearerToken } from "./helpers.js";

const OWNER_ID = "33333333-3333-3333-3333-333333333333";
const CANDIDATE_ID = "44444444-4444-4444-4444-444444444444";

runIntegrationSuite("MSME profile integration", () => {
  beforeAll(getServer);
  afterAll(closeServer);
  beforeEach(resetDb);

  it("POST /api/v1/msme/me creates MSME profile", async () => {
    const server = await getServer();
    const token = await makeBearerToken(OWNER_ID, ["MSME"]);

    const res = await server.inject({
      method: "POST",
      url: "/api/v1/msme/me",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify({
        legalName: "Acme Technologies Inc.",
        primaryContactName: "John Doe",
        primaryContactEmail: "john@acme.example.com",
      }),
    });

    expect(res.statusCode).toBe(201);
    const body = res.json() as Record<string, unknown>;
    expect(body.legalName).toBe("Acme Technologies Inc.");
    expect(body.ownerUserId).toBe(OWNER_ID);
    // EIN not provided, hasEin should be false
    expect(body.hasEin).toBe(false);
  });

  it("EIN is encrypted in DB (not stored as plaintext)", async () => {
    const { getPrisma } = await import("./helpers.js");
    const server = await getServer();
    const token = await makeBearerToken(OWNER_ID, ["MSME"]);

    await server.inject({
      method: "POST",
      url: "/api/v1/msme/me",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify({
        legalName: "Acme Inc.",
        ein: "12-3456789",
      }),
    });

    const prisma = getPrisma();
    const record = await prisma.msmeProfile.findUnique({ where: { ownerUserId: OWNER_ID } });
    expect(record).not.toBeNull();
    // hasEin returns true
    expect(record?.einEncrypted).not.toBeNull();
    // The raw DB value should NOT be the plain EIN string
    const encrypted = record?.einEncrypted as Record<string, unknown> | null;
    expect(encrypted?.ciphertext).toBeDefined();
    expect(encrypted?.ciphertext).not.toBe("12-3456789");
  });

  it("POST /api/v1/msme/me/bench adds bench entry", async () => {
    const server = await getServer();
    const token = await makeBearerToken(OWNER_ID, ["MSME"]);

    // Create MSME first
    await server.inject({
      method: "POST",
      url: "/api/v1/msme/me",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify({ legalName: "My MSME" }),
    });

    const res = await server.inject({
      method: "POST",
      url: "/api/v1/msme/me/bench",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify({
        candidateUserId: CANDIDATE_ID,
        skills: ["Java", "AWS"],
        expectedRateMin: 80,
        expectedRateMax: 120,
      }),
    });

    expect(res.statusCode).toBe(201);
    const body = res.json() as Record<string, unknown>;
    expect(body.candidateUserId).toBe(CANDIDATE_ID);
    expect(Array.isArray(body.skills) && (body.skills as string[]).includes("Java")).toBe(true);
  });
});
