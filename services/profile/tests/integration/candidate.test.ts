import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { InterviewSummary } from "@techorbit/types";
import {
  runIntegrationSuite,
  getServer,
  closeServer,
  resetDb,
  makeBearerToken,
  stubInterviewSummaries,
  type StubInterviewSummary,
} from "./helpers.js";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_USER_ID = "22222222-2222-2222-2222-222222222222";

runIntegrationSuite("Candidate profile integration", () => {
  beforeAll(getServer);
  afterAll(closeServer);
  beforeEach(resetDb);

  it("GET /api/v1/candidates/me returns 404 when no profile exists", async () => {
    const server = await getServer();
    const token = await makeBearerToken(USER_ID, ["CANDIDATE"]);

    const res = await server.inject({
      method: "GET",
      url: "/api/v1/candidates/me",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it("PATCH /api/v1/candidates/me creates a profile upsert", async () => {
    const server = await getServer();
    const token = await makeBearerToken(USER_ID, ["CANDIDATE"]);

    const res = await server.inject({
      method: "PATCH",
      url: "/api/v1/candidates/me",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify({
        headline: "Senior Java Developer",
        skills: ["Java", "Spring Boot", "AWS"],
        seniority: "SENIOR",
        preferRemote: true,
      }),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as Record<string, unknown>;
    expect(body.headline).toBe("Senior Java Developer");
    expect(body.skills).toContain("Java");
    expect(body.seniority).toBe("SENIOR");
    expect(body.userId).toBe(USER_ID);
  });

  it("GET /api/v1/candidates/me returns created profile", async () => {
    const server = await getServer();
    const token = await makeBearerToken(USER_ID, ["CANDIDATE"]);

    // Create first
    await server.inject({
      method: "PATCH",
      url: "/api/v1/candidates/me",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify({ headline: "Software Engineer", skills: ["Python"] }),
    });

    const res = await server.inject({
      method: "GET",
      url: "/api/v1/candidates/me",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as Record<string, unknown>;
    expect(body.headline).toBe("Software Engineer");
  });

  it("GET /api/v1/candidates/:userId returns 403 for different user", async () => {
    const server = await getServer();
    const ownerToken = await makeBearerToken(USER_ID, ["CANDIDATE"]);
    const otherToken = await makeBearerToken(OTHER_USER_ID, ["CANDIDATE"]);

    // Owner creates profile
    await server.inject({
      method: "PATCH",
      url: "/api/v1/candidates/me",
      headers: { authorization: `Bearer ${ownerToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ headline: "Owner profile" }),
    });

    // Other user tries to read
    const res = await server.inject({
      method: "GET",
      url: `/api/v1/candidates/${USER_ID}`,
      headers: { authorization: `Bearer ${otherToken}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("admin can read any candidate profile", async () => {
    const server = await getServer();
    const ownerToken = await makeBearerToken(USER_ID, ["CANDIDATE"]);
    const adminToken = await makeBearerToken(OTHER_USER_ID, ["ADMIN"]);

    await server.inject({
      method: "PATCH",
      url: "/api/v1/candidates/me",
      headers: { authorization: `Bearer ${ownerToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ headline: "Admin-readable profile" }),
    });

    const res = await server.inject({
      method: "GET",
      url: `/api/v1/candidates/${USER_ID}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
  });

  it("returns 401 without token", async () => {
    const server = await getServer();
    const res = await server.inject({ method: "GET", url: "/api/v1/candidates/me" });
    expect(res.statusCode).toBe(401);
  });

  // ── Public endpoint (narrow, safe-to-browse subset) ────────────────────────

  it("GET /api/v1/candidates/:userId/public returns narrow fields for any authed user", async () => {
    const server = await getServer();
    const ownerToken = await makeBearerToken(USER_ID, ["CANDIDATE"]);
    const viewerToken = await makeBearerToken(OTHER_USER_ID, ["CUSTOMER"]);

    await server.inject({
      method: "PATCH",
      url: "/api/v1/candidates/me",
      headers: { authorization: `Bearer ${ownerToken}`, "content-type": "application/json" },
      payload: JSON.stringify({
        headline: "Senior Full-Stack Engineer",
        seniority: "SENIOR",
        location: "Austin, TX",
        skills: ["React"],
        rateMin: 100,
        rateMax: 140,
      }),
    });

    const res = await server.inject({
      method: "GET",
      url: `/api/v1/candidates/${USER_ID}/public`,
      headers: { authorization: `Bearer ${viewerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as Record<string, unknown>;
    // Exactly the public subset — no rate / KYC / resume fields leak.
    expect(Object.keys(body).sort()).toEqual([
      "featuredInterviews",
      "headline",
      "location",
      "seniority",
      "userId",
    ]);
    expect(body.headline).toBe("Senior Full-Stack Engineer");
    expect(body.seniority).toBe("SENIOR");
    expect(body.userId).toBe(USER_ID);
    expect(body.location).toBe("Austin, TX");
    expect(body.featuredInterviews).toEqual([]);
  });

  it("public endpoint is 404 when the profile doesn't exist", async () => {
    const server = await getServer();
    const viewerToken = await makeBearerToken(OTHER_USER_ID, ["CUSTOMER"]);
    const res = await server.inject({
      method: "GET",
      url: `/api/v1/candidates/${USER_ID}/public`,
      headers: { authorization: `Bearer ${viewerToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it("public endpoint requires authentication", async () => {
    const server = await getServer();
    const res = await server.inject({
      method: "GET",
      url: `/api/v1/candidates/${USER_ID}/public`,
    });
    expect(res.statusCode).toBe(401);
  });

  // ── Featured interviews ────────────────────────────────────────────────────

  const IV_A = "aaaaaaa1-0000-0000-0000-000000000001";
  const IV_B = "aaaaaaa1-0000-0000-0000-000000000002";
  const IV_C = "aaaaaaa1-0000-0000-0000-000000000003";

  function buildSummary(
    overrides: Partial<StubInterviewSummary> & Pick<StubInterviewSummary, "id">,
  ): StubInterviewSummary {
    return {
      id: overrides.id,
      scheduledStart: "2026-04-20T15:00:00.000Z",
      durationSec: 900,
      conductedByRole: "PLATFORM_INTERVIEWER",
      recordingStatus: "READY",
      recordingUrl: `https://mock.daily.co/recording-${overrides.id}.mp4`,
      recommendation: "YES",
      overallScore: 4.2,
      candidateId: USER_ID,
      ...overrides,
    };
  }

  async function primeProfile(): Promise<void> {
    const server = await getServer();
    const ownerToken = await makeBearerToken(USER_ID, ["CANDIDATE"]);
    await server.inject({
      method: "PATCH",
      url: "/api/v1/candidates/me",
      headers: { authorization: `Bearer ${ownerToken}`, "content-type": "application/json" },
      payload: JSON.stringify({
        headline: "Senior Full-Stack Engineer",
        skills: ["React"],
        seniority: "SENIOR",
      }),
    });
  }

  it("PATCH /candidates/me/featured-interviews — saves the ordered list", async () => {
    await primeProfile();
    stubInterviewSummaries([buildSummary({ id: IV_A }), buildSummary({ id: IV_B })]);
    const server = await getServer();
    const ownerToken = await makeBearerToken(USER_ID, ["CANDIDATE"]);

    const res = await server.inject({
      method: "PATCH",
      url: "/api/v1/candidates/me/featured-interviews",
      headers: { authorization: `Bearer ${ownerToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ interviewIds: [IV_B, IV_A] }),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as Record<string, unknown>;
    expect(body.featuredInterviewIds).toEqual([IV_B, IV_A]);
    vi.restoreAllMocks();
  });

  it("PATCH rejects interviews the candidate doesn't own", async () => {
    await primeProfile();
    // Stub returns nothing for this candidateId — profile-svc passes the
    // candidateId filter to interview-svc, which drops unowned rows.
    stubInterviewSummaries([
      buildSummary({ id: IV_A, candidateId: "99999999-0000-0000-0000-000000000001" }),
    ]);
    const server = await getServer();
    const ownerToken = await makeBearerToken(USER_ID, ["CANDIDATE"]);

    const res = await server.inject({
      method: "PATCH",
      url: "/api/v1/candidates/me/featured-interviews",
      headers: { authorization: `Bearer ${ownerToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ interviewIds: [IV_A] }),
    });

    expect(res.statusCode).toBe(400);
    vi.restoreAllMocks();
  });

  it("PATCH rejects interviews without a ready recording", async () => {
    await primeProfile();
    stubInterviewSummaries([
      buildSummary({ id: IV_A, recordingStatus: "PROCESSING", recordingUrl: null }),
    ]);
    const server = await getServer();
    const ownerToken = await makeBearerToken(USER_ID, ["CANDIDATE"]);

    const res = await server.inject({
      method: "PATCH",
      url: "/api/v1/candidates/me/featured-interviews",
      headers: { authorization: `Bearer ${ownerToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ interviewIds: [IV_A] }),
    });

    expect(res.statusCode).toBe(400);
    vi.restoreAllMocks();
  });

  it("PATCH rejects more than 6 interviews and duplicates", async () => {
    await primeProfile();
    const server = await getServer();
    const ownerToken = await makeBearerToken(USER_ID, ["CANDIDATE"]);

    const tooMany = await server.inject({
      method: "PATCH",
      url: "/api/v1/candidates/me/featured-interviews",
      headers: { authorization: `Bearer ${ownerToken}`, "content-type": "application/json" },
      payload: JSON.stringify({
        interviewIds: Array.from({ length: 7 }, (_, i) =>
          `aaaaaaa1-0000-0000-0000-00000000000${i + 1}`,
        ),
      }),
    });
    expect(tooMany.statusCode).toBe(400);

    const dup = await server.inject({
      method: "PATCH",
      url: "/api/v1/candidates/me/featured-interviews",
      headers: { authorization: `Bearer ${ownerToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ interviewIds: [IV_A, IV_A] }),
    });
    expect(dup.statusCode).toBe(400);
  });

  it("public endpoint embeds featured interview summaries in candidate's chosen order", async () => {
    await primeProfile();
    stubInterviewSummaries([
      buildSummary({ id: IV_A }),
      buildSummary({ id: IV_B }),
      buildSummary({ id: IV_C }),
    ]);
    const server = await getServer();
    const ownerToken = await makeBearerToken(USER_ID, ["CANDIDATE"]);

    await server.inject({
      method: "PATCH",
      url: "/api/v1/candidates/me/featured-interviews",
      headers: { authorization: `Bearer ${ownerToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ interviewIds: [IV_C, IV_A, IV_B] }),
    });

    const viewerToken = await makeBearerToken(OTHER_USER_ID, ["CUSTOMER"]);
    const pub = await server.inject({
      method: "GET",
      url: `/api/v1/candidates/${USER_ID}/public`,
      headers: { authorization: `Bearer ${viewerToken}` },
    });

    expect(pub.statusCode).toBe(200);
    const body = pub.json() as { featuredInterviews: InterviewSummary[] };
    expect(body.featuredInterviews.map((f) => f.id)).toEqual([IV_C, IV_A, IV_B]);
    expect(body.featuredInterviews[0]?.recordingUrl).toBeTruthy();
    vi.restoreAllMocks();
  });
});
