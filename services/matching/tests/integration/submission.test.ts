import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import {
  buildCandidate,
  buildRequirement,
  closeServer,
  getPrisma,
  getServer,
  makeBearerToken,
  resetDb,
  runIntegrationSuite,
  stubCrossServiceFetch,
} from "./helpers.js";

const CUSTOMER = "99999999-9999-9999-9999-999999999999";
const CANDIDATE_A = "11111111-1111-1111-1111-111111111111";
const CANDIDATE_B = "22222222-2222-2222-2222-222222222222";
const SRM = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const MSME = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const REQUIREMENT = "aaaaaaaa-1111-1111-1111-111111111111";
const REQUIREMENT_CLOSED = "aaaaaaaa-2222-2222-2222-222222222222";

runIntegrationSuite("submissions", () => {
  beforeAll(getServer);
  afterAll(closeServer);
  beforeEach(async () => {
    await resetDb();
    vi.restoreAllMocks();
  });

  it("candidate self-submits to OPEN requirement — 201, attribution null, score filled", async () => {
    stubCrossServiceFetch({
      candidates: [buildCandidate({ userId: CANDIDATE_A })],
      requirements: [buildRequirement({ id: REQUIREMENT, createdByUserId: CUSTOMER })],
    });
    const server = await getServer();
    const token = await makeBearerToken(CANDIDATE_A, ["CANDIDATE"]);

    const res = await server.inject({
      method: "POST",
      url: "/api/v1/submissions",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify({
        requirementId: REQUIREMENT,
        candidateId: CANDIDATE_A,
        coverNote: "Excited to apply",
      }),
    });

    expect(res.statusCode).toBe(201);
    const body = res.json() as Record<string, unknown>;
    expect(body.requirementId).toBe(REQUIREMENT);
    expect(body.candidateId).toBe(CANDIDATE_A);
    expect(body.submitterRole).toBe("CANDIDATE_SELF");
    expect(body.attributedSrmId).toBeNull();
    expect(body.attributedMsmeId).toBeNull();
    expect(body.status).toBe("SUBMITTED");
    expect(body.matchScore).toBeGreaterThan(0);
    expect(body.coverNote).toBe("Excited to apply");
  });

  it("SRM submits a candidate — attributedSrmId set to SRM's userId", async () => {
    stubCrossServiceFetch({
      candidates: [buildCandidate({ userId: CANDIDATE_A })],
      requirements: [buildRequirement({ id: REQUIREMENT, createdByUserId: CUSTOMER })],
    });
    const server = await getServer();
    const token = await makeBearerToken(SRM, ["SRM"]);

    const res = await server.inject({
      method: "POST",
      url: "/api/v1/submissions",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify({
        requirementId: REQUIREMENT,
        candidateId: CANDIDATE_A,
      }),
    });

    expect(res.statusCode).toBe(201);
    const body = res.json() as Record<string, unknown>;
    expect(body.submitterRole).toBe("SRM");
    expect(body.attributedSrmId).toBe(SRM);
    expect(body.attributedMsmeId).toBeNull();
  });

  it("MSME submits a candidate — attributedMsmeId set", async () => {
    stubCrossServiceFetch({
      candidates: [buildCandidate({ userId: CANDIDATE_A })],
      requirements: [buildRequirement({ id: REQUIREMENT, createdByUserId: CUSTOMER })],
    });
    const server = await getServer();
    const token = await makeBearerToken(MSME, ["MSME"]);

    const res = await server.inject({
      method: "POST",
      url: "/api/v1/submissions",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify({
        requirementId: REQUIREMENT,
        candidateId: CANDIDATE_A,
      }),
    });

    expect(res.statusCode).toBe(201);
    const body = res.json() as Record<string, unknown>;
    expect(body.submitterRole).toBe("MSME");
    expect(body.attributedMsmeId).toBe(MSME);
    expect(body.attributedSrmId).toBeNull();
  });

  it("duplicate submission (same requirement + candidate) → 409", async () => {
    stubCrossServiceFetch({
      candidates: [buildCandidate({ userId: CANDIDATE_A })],
      requirements: [buildRequirement({ id: REQUIREMENT, createdByUserId: CUSTOMER })],
    });
    const server = await getServer();
    const token = await makeBearerToken(CANDIDATE_A, ["CANDIDATE"]);

    await server.inject({
      method: "POST",
      url: "/api/v1/submissions",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify({ requirementId: REQUIREMENT, candidateId: CANDIDATE_A }),
    });
    const dup = await server.inject({
      method: "POST",
      url: "/api/v1/submissions",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify({ requirementId: REQUIREMENT, candidateId: CANDIDATE_A }),
    });
    expect(dup.statusCode).toBe(409);
  });

  it("submitting to non-OPEN requirement → 400", async () => {
    stubCrossServiceFetch({
      candidates: [buildCandidate({ userId: CANDIDATE_A })],
      requirements: [
        buildRequirement({ id: REQUIREMENT_CLOSED, createdByUserId: CUSTOMER, status: "CLOSED" }),
      ],
    });
    const server = await getServer();
    const token = await makeBearerToken(CANDIDATE_A, ["CANDIDATE"]);

    const res = await server.inject({
      method: "POST",
      url: "/api/v1/submissions",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify({ requirementId: REQUIREMENT_CLOSED, candidateId: CANDIDATE_A }),
    });
    expect(res.statusCode).toBe(400);
  });

  it("submitting when candidate profile is incomplete → 400", async () => {
    stubCrossServiceFetch({
      candidates: [buildCandidate({ userId: CANDIDATE_A, isProfileComplete: false })],
      requirements: [buildRequirement({ id: REQUIREMENT, createdByUserId: CUSTOMER })],
    });
    const server = await getServer();
    const token = await makeBearerToken(CANDIDATE_A, ["CANDIDATE"]);

    const res = await server.inject({
      method: "POST",
      url: "/api/v1/submissions",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify({ requirementId: REQUIREMENT, candidateId: CANDIDATE_A }),
    });
    expect(res.statusCode).toBe(400);
  });

  it("candidate submitting someone else → 403", async () => {
    stubCrossServiceFetch({
      candidates: [buildCandidate({ userId: CANDIDATE_B })],
      requirements: [buildRequirement({ id: REQUIREMENT, createdByUserId: CUSTOMER })],
    });
    const server = await getServer();
    const token = await makeBearerToken(CANDIDATE_A, ["CANDIDATE"]);

    const res = await server.inject({
      method: "POST",
      url: "/api/v1/submissions",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify({ requirementId: REQUIREMENT, candidateId: CANDIDATE_B }),
    });
    expect(res.statusCode).toBe(403);
  });

  it("customer updates submission status — 200 and row reflects new status", async () => {
    stubCrossServiceFetch({
      candidates: [buildCandidate({ userId: CANDIDATE_A })],
      requirements: [buildRequirement({ id: REQUIREMENT, createdByUserId: CUSTOMER })],
    });
    const server = await getServer();
    const candToken = await makeBearerToken(CANDIDATE_A, ["CANDIDATE"]);

    const created = await server.inject({
      method: "POST",
      url: "/api/v1/submissions",
      headers: { authorization: `Bearer ${candToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ requirementId: REQUIREMENT, candidateId: CANDIDATE_A }),
    });
    const { id } = created.json() as { id: string };

    const custToken = await makeBearerToken(CUSTOMER, ["CUSTOMER"]);
    const res = await server.inject({
      method: "PATCH",
      url: `/api/v1/submissions/${id}/status`,
      headers: { authorization: `Bearer ${custToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ status: "SCREENING" }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { status: string };
    expect(body.status).toBe("SCREENING");
  });

  it("non-owner attempting to update submission status → 403", async () => {
    stubCrossServiceFetch({
      candidates: [buildCandidate({ userId: CANDIDATE_A })],
      requirements: [buildRequirement({ id: REQUIREMENT, createdByUserId: CUSTOMER })],
    });
    const server = await getServer();
    const candToken = await makeBearerToken(CANDIDATE_A, ["CANDIDATE"]);

    const created = await server.inject({
      method: "POST",
      url: "/api/v1/submissions",
      headers: { authorization: `Bearer ${candToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ requirementId: REQUIREMENT, candidateId: CANDIDATE_A }),
    });
    const { id } = created.json() as { id: string };

    // Random user, not the requirement owner.
    const otherToken = await makeBearerToken(SRM, ["SRM"]);
    const res = await server.inject({
      method: "PATCH",
      url: `/api/v1/submissions/${id}/status`,
      headers: { authorization: `Bearer ${otherToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ status: "SCREENING" }),
    });
    expect(res.statusCode).toBe(403);
  });

  it("submitter withdraws — 200, status WITHDRAWN, withdrawn* fields populated", async () => {
    stubCrossServiceFetch({
      candidates: [buildCandidate({ userId: CANDIDATE_A })],
      requirements: [buildRequirement({ id: REQUIREMENT, createdByUserId: CUSTOMER })],
    });
    const server = await getServer();
    const candToken = await makeBearerToken(CANDIDATE_A, ["CANDIDATE"]);

    const created = await server.inject({
      method: "POST",
      url: "/api/v1/submissions",
      headers: { authorization: `Bearer ${candToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ requirementId: REQUIREMENT, candidateId: CANDIDATE_A }),
    });
    const { id } = created.json() as { id: string };

    const res = await server.inject({
      method: "POST",
      url: `/api/v1/submissions/${id}/withdraw`,
      headers: { authorization: `Bearer ${candToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ reason: "Accepted another offer" }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Record<string, unknown>;
    expect(body.status).toBe("WITHDRAWN");
    expect(body.withdrawnAt).toBeTruthy();
    expect(body.withdrawnReason).toBe("Accepted another offer");
  });

  it("non-submitter withdrawing → 403", async () => {
    stubCrossServiceFetch({
      candidates: [buildCandidate({ userId: CANDIDATE_A })],
      requirements: [buildRequirement({ id: REQUIREMENT, createdByUserId: CUSTOMER })],
    });
    const server = await getServer();
    const candToken = await makeBearerToken(CANDIDATE_A, ["CANDIDATE"]);

    const created = await server.inject({
      method: "POST",
      url: "/api/v1/submissions",
      headers: { authorization: `Bearer ${candToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ requirementId: REQUIREMENT, candidateId: CANDIDATE_A }),
    });
    const { id } = created.json() as { id: string };

    const custToken = await makeBearerToken(CUSTOMER, ["CUSTOMER"]);
    const res = await server.inject({
      method: "POST",
      url: `/api/v1/submissions/${id}/withdraw`,
      headers: { authorization: `Bearer ${custToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ reason: "Hmm" }),
    });
    expect(res.statusCode).toBe(403);
  });

  it("list as customer — sees submissions for their requirement", async () => {
    stubCrossServiceFetch({
      candidates: [
        buildCandidate({ userId: CANDIDATE_A }),
        buildCandidate({ userId: CANDIDATE_B }),
      ],
      requirements: [buildRequirement({ id: REQUIREMENT, createdByUserId: CUSTOMER })],
    });
    const server = await getServer();

    // Two separate candidates submit.
    for (const cand of [CANDIDATE_A, CANDIDATE_B]) {
      const token = await makeBearerToken(cand, ["CANDIDATE"]);
      await server.inject({
        method: "POST",
        url: "/api/v1/submissions",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        payload: JSON.stringify({ requirementId: REQUIREMENT, candidateId: cand }),
      });
    }

    const custToken = await makeBearerToken(CUSTOMER, ["CUSTOMER"]);
    const res = await server.inject({
      method: "GET",
      url: `/api/v1/submissions?requirementId=${REQUIREMENT}`,
      headers: { authorization: `Bearer ${custToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: Record<string, unknown>[] };
    expect(body.data).toHaveLength(2);
  });

  it("list as candidate — sees only their own submissions", async () => {
    stubCrossServiceFetch({
      candidates: [
        buildCandidate({ userId: CANDIDATE_A }),
        buildCandidate({ userId: CANDIDATE_B }),
      ],
      requirements: [buildRequirement({ id: REQUIREMENT, createdByUserId: CUSTOMER })],
    });
    const server = await getServer();

    for (const cand of [CANDIDATE_A, CANDIDATE_B]) {
      const token = await makeBearerToken(cand, ["CANDIDATE"]);
      await server.inject({
        method: "POST",
        url: "/api/v1/submissions",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        payload: JSON.stringify({ requirementId: REQUIREMENT, candidateId: cand }),
      });
    }

    const candAToken = await makeBearerToken(CANDIDATE_A, ["CANDIDATE"]);
    const res = await server.inject({
      method: "GET",
      url: "/api/v1/submissions",
      headers: { authorization: `Bearer ${candAToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: Record<string, unknown>[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.candidateId).toBe(CANDIDATE_A);
  });

  it("outgoing event row is enqueued on submission create", async () => {
    stubCrossServiceFetch({
      candidates: [buildCandidate({ userId: CANDIDATE_A })],
      requirements: [buildRequirement({ id: REQUIREMENT, createdByUserId: CUSTOMER })],
    });
    const server = await getServer();
    const token = await makeBearerToken(CANDIDATE_A, ["CANDIDATE"]);

    await server.inject({
      method: "POST",
      url: "/api/v1/submissions",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify({ requirementId: REQUIREMENT, candidateId: CANDIDATE_A }),
    });

    const events = await getPrisma().outgoingEvent.findMany({
      where: { eventType: "submission.created.v1" },
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.status).toBe("PENDING");
  });
});
