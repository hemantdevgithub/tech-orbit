import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import {
  buildSubmission,
  closeServer,
  getPrisma,
  getServer,
  makeBearerToken,
  resetDb,
  runIntegrationSuite,
  stubCrossServiceFetch,
} from "./helpers.js";

const CUSTOMER = "aaaaaaaa-1111-1111-1111-111111111111";
const CANDIDATE = "cccccccc-1111-1111-1111-111111111111";
const INTERVIEWER_USER = "bbbbbbbb-1111-1111-1111-111111111111";
const SUBMISSION_ID = "dddddddd-1111-1111-1111-111111111111";
const REQUIREMENT_ID = "eeeeeeee-1111-1111-1111-111111111111";

function futureDate(offsetHours: number): string {
  return new Date(Date.now() + offsetHours * 3600 * 1000).toISOString();
}

function interviewPayload(overrides: Record<string, unknown> = {}) {
  return {
    requirementId: REQUIREMENT_ID,
    submissionId: SUBMISSION_ID,
    candidateId: CANDIDATE,
    scheduledStart: futureDate(24),
    scheduledEnd: futureDate(25),
    ...overrides,
  };
}

runIntegrationSuite("interviews", () => {
  beforeAll(getServer);
  afterAll(closeServer);
  beforeEach(async () => {
    await resetDb();
    vi.restoreAllMocks();
  });

  it("customer schedules a self-conduct interview → 201, conductedByRole=CUSTOMER_INTERNAL", async () => {
    stubCrossServiceFetch({ submissions: [buildSubmission()], interviewers: [] });
    const server = await getServer();
    const token = await makeBearerToken(CUSTOMER, ["CUSTOMER"]);

    const res = await server.inject({
      method: "POST",
      url: "/api/v1/interviews",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify(interviewPayload()),
    });

    expect(res.statusCode).toBe(201);
    const body = res.json() as Record<string, unknown>;
    expect(body.conductedByRole).toBe("CUSTOMER_INTERNAL");
    expect(body.interviewerUserId).toBeNull();
    expect(body.videoRoomUrl).toBeTruthy();
    expect(body.status).toBe("SCHEDULED");
  });

  it("customer schedules with a platform interviewer → conductedByRole=PLATFORM_INTERVIEWER", async () => {
    stubCrossServiceFetch({
      submissions: [buildSubmission()],
      interviewers: [{ id: "ii", userId: INTERVIEWER_USER, displayName: "Jay", specializations: ["React"], isVerified: true }],
    });
    const server = await getServer();
    const token = await makeBearerToken(CUSTOMER, ["CUSTOMER"]);

    const res = await server.inject({
      method: "POST",
      url: "/api/v1/interviews",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify(interviewPayload({ interviewerUserId: INTERVIEWER_USER })),
    });

    expect(res.statusCode).toBe(201);
    const body = res.json() as Record<string, unknown>;
    expect(body.conductedByRole).toBe("PLATFORM_INTERVIEWER");
    expect(body.interviewerUserId).toBe(INTERVIEWER_USER);
  });

  it("non-CUSTOMER cannot schedule → 403", async () => {
    stubCrossServiceFetch({ submissions: [buildSubmission()], interviewers: [] });
    const server = await getServer();
    const token = await makeBearerToken(CANDIDATE, ["CANDIDATE"]);

    const res = await server.inject({
      method: "POST",
      url: "/api/v1/interviews",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify(interviewPayload()),
    });
    expect(res.statusCode).toBe(403);
  });

  it("scheduling for a submission in WITHDRAWN status → 400", async () => {
    stubCrossServiceFetch({
      submissions: [buildSubmission({ status: "WITHDRAWN" })],
      interviewers: [],
    });
    const server = await getServer();
    const token = await makeBearerToken(CUSTOMER, ["CUSTOMER"]);

    const res = await server.inject({
      method: "POST",
      url: "/api/v1/interviews",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify(interviewPayload()),
    });
    expect(res.statusCode).toBe(400);
  });

  it("participant can start and end the interview — status transitions correctly", async () => {
    stubCrossServiceFetch({ submissions: [buildSubmission()], interviewers: [] });
    const server = await getServer();
    const custToken = await makeBearerToken(CUSTOMER, ["CUSTOMER"]);

    const create = await server.inject({
      method: "POST",
      url: "/api/v1/interviews",
      headers: { authorization: `Bearer ${custToken}`, "content-type": "application/json" },
      payload: JSON.stringify(interviewPayload()),
    });
    const { id } = create.json() as { id: string };

    const start = await server.inject({
      method: "POST",
      url: `/api/v1/interviews/${id}/start`,
      headers: { authorization: `Bearer ${custToken}` },
    });
    expect(start.statusCode).toBe(200);
    expect((start.json() as Record<string, unknown>).status).toBe("IN_PROGRESS");

    const end = await server.inject({
      method: "POST",
      url: `/api/v1/interviews/${id}/end`,
      headers: { authorization: `Bearer ${custToken}` },
    });
    expect(end.statusCode).toBe(200);
    expect((end.json() as Record<string, unknown>).status).toBe("COMPLETED");
  });

  it("customer cancels a SCHEDULED interview → status CANCELLED", async () => {
    stubCrossServiceFetch({ submissions: [buildSubmission()], interviewers: [] });
    const server = await getServer();
    const custToken = await makeBearerToken(CUSTOMER, ["CUSTOMER"]);

    const create = await server.inject({
      method: "POST",
      url: "/api/v1/interviews",
      headers: { authorization: `Bearer ${custToken}`, "content-type": "application/json" },
      payload: JSON.stringify(interviewPayload()),
    });
    const { id } = create.json() as { id: string };

    const cancel = await server.inject({
      method: "POST",
      url: `/api/v1/interviews/${id}/cancel`,
      headers: { authorization: `Bearer ${custToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ reason: "Rescheduling conflict" }),
    });
    expect(cancel.statusCode).toBe(200);
    const body = cancel.json() as Record<string, unknown>;
    expect(body.status).toBe("CANCELLED");
    expect(body.cancelReason).toBe("Rescheduling conflict");
    expect(body.cancelledBy).toBe(CUSTOMER);
  });

  it("non-participant cannot cancel → 403", async () => {
    stubCrossServiceFetch({ submissions: [buildSubmission()], interviewers: [] });
    const server = await getServer();
    const custToken = await makeBearerToken(CUSTOMER, ["CUSTOMER"]);

    const create = await server.inject({
      method: "POST",
      url: "/api/v1/interviews",
      headers: { authorization: `Bearer ${custToken}`, "content-type": "application/json" },
      payload: JSON.stringify(interviewPayload()),
    });
    const { id } = create.json() as { id: string };

    const randomUser = await makeBearerToken("ffffffff-ffff-ffff-ffff-ffffffffffff", ["CANDIDATE"]);
    const cancel = await server.inject({
      method: "POST",
      url: `/api/v1/interviews/${id}/cancel`,
      headers: { authorization: `Bearer ${randomUser}`, "content-type": "application/json" },
      payload: JSON.stringify({ reason: "Bad actor" }),
    });
    expect(cancel.statusCode).toBe(403);
  });

  it("interviewer submits scorecard → 201, customer can read it", async () => {
    stubCrossServiceFetch({
      submissions: [buildSubmission()],
      interviewers: [{ id: "ii", userId: INTERVIEWER_USER, displayName: "Jay", specializations: [], isVerified: true }],
    });
    const server = await getServer();
    const custToken = await makeBearerToken(CUSTOMER, ["CUSTOMER"]);

    const create = await server.inject({
      method: "POST",
      url: "/api/v1/interviews",
      headers: { authorization: `Bearer ${custToken}`, "content-type": "application/json" },
      payload: JSON.stringify(interviewPayload({ interviewerUserId: INTERVIEWER_USER })),
    });
    const { id: interviewId } = create.json() as { id: string };

    const ivToken = await makeBearerToken(INTERVIEWER_USER, ["INTERVIEWER"]);
    const sc = await server.inject({
      method: "POST",
      url: "/api/v1/scorecards",
      headers: { authorization: `Bearer ${ivToken}`, "content-type": "application/json" },
      payload: JSON.stringify({
        interviewId,
        recommendation: "YES",
        technicalScore: 4,
        communicationScore: 5,
        freeformFeedback: "Strong candidate with clear problem-solving skills.",
        wouldHireAgain: true,
      }),
    });
    expect(sc.statusCode).toBe(201);
    const scBody = sc.json() as Record<string, unknown>;
    expect(scBody.recommendation).toBe("YES");
    expect(scBody.technicalScore).toBe(4);

    // Customer can read it
    const get = await server.inject({
      method: "GET",
      url: `/api/v1/scorecards?interviewId=${interviewId}`,
      headers: { authorization: `Bearer ${custToken}` },
    });
    expect(get.statusCode).toBe(200);
    expect((get.json() as Record<string, unknown>).recommendation).toBe("YES");
  });

  it("candidate cannot read scorecard → 403", async () => {
    stubCrossServiceFetch({ submissions: [buildSubmission()], interviewers: [] });
    const server = await getServer();
    const custToken = await makeBearerToken(CUSTOMER, ["CUSTOMER"]);

    const create = await server.inject({
      method: "POST",
      url: "/api/v1/interviews",
      headers: { authorization: `Bearer ${custToken}`, "content-type": "application/json" },
      payload: JSON.stringify(interviewPayload()),
    });
    const { id: interviewId } = create.json() as { id: string };

    await server.inject({
      method: "POST",
      url: "/api/v1/scorecards",
      headers: { authorization: `Bearer ${custToken}`, "content-type": "application/json" },
      payload: JSON.stringify({
        interviewId,
        recommendation: "NO",
        freeformFeedback: "Not a fit.",
      }),
    });

    const candToken = await makeBearerToken(CANDIDATE, ["CANDIDATE"]);
    const get = await server.inject({
      method: "GET",
      url: `/api/v1/scorecards?interviewId=${interviewId}`,
      headers: { authorization: `Bearer ${candToken}` },
    });
    expect(get.statusCode).toBe(403);
  });

  it("customer list shows only their own interviews", async () => {
    stubCrossServiceFetch({ submissions: [buildSubmission()], interviewers: [] });
    const server = await getServer();
    const custToken = await makeBearerToken(CUSTOMER, ["CUSTOMER"]);
    const otherToken = await makeBearerToken("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", ["CUSTOMER"]);

    // CUSTOMER creates one
    await server.inject({
      method: "POST",
      url: "/api/v1/interviews",
      headers: { authorization: `Bearer ${custToken}`, "content-type": "application/json" },
      payload: JSON.stringify(interviewPayload()),
    });

    // other customer lists — should see 0
    const res = await server.inject({
      method: "GET",
      url: "/api/v1/interviews",
      headers: { authorization: `Bearer ${otherToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { data: unknown[] }).data).toHaveLength(0);
  });

  it("start/end transitions recording status NONE → RECORDING → READY (mock)", async () => {
    stubCrossServiceFetch({ submissions: [buildSubmission()], interviewers: [] });
    const server = await getServer();
    const custToken = await makeBearerToken(CUSTOMER, ["CUSTOMER"]);

    const create = await server.inject({
      method: "POST",
      url: "/api/v1/interviews",
      headers: { authorization: `Bearer ${custToken}`, "content-type": "application/json" },
      payload: JSON.stringify(interviewPayload()),
    });
    const { id } = create.json() as { id: string };

    // Pre-start: recording status is NONE.
    const pre = await server.inject({
      method: "GET",
      url: `/api/v1/interviews/${id}`,
      headers: { authorization: `Bearer ${custToken}` },
    });
    expect((pre.json() as Record<string, unknown>).videoRecordingStatus).toBe("NONE");

    // Start → RECORDING.
    await server.inject({
      method: "POST",
      url: `/api/v1/interviews/${id}/start`,
      headers: { authorization: `Bearer ${custToken}` },
    });
    const mid = await server.inject({
      method: "GET",
      url: `/api/v1/interviews/${id}`,
      headers: { authorization: `Bearer ${custToken}` },
    });
    const midBody = mid.json() as Record<string, unknown>;
    expect(midBody.videoRecordingStatus).toBe("RECORDING");
    expect(midBody.videoRecordingStartedAt).toBeTruthy();

    // End → mock provider returns a recording synchronously, so status
    // should be READY once the best-effort fetch resolves. Poll briefly
    // to cover the tiny async window.
    await server.inject({
      method: "POST",
      url: `/api/v1/interviews/${id}/end`,
      headers: { authorization: `Bearer ${custToken}` },
    });

    let body: Record<string, unknown> = {};
    for (let attempt = 0; attempt < 20; attempt++) {
      const r = await server.inject({
        method: "GET",
        url: `/api/v1/interviews/${id}`,
        headers: { authorization: `Bearer ${custToken}` },
      });
      body = r.json() as Record<string, unknown>;
      if (body.videoRecordingStatus === "READY") break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(body.videoRecordingStatus).toBe("READY");
    expect(body.videoRecordingUrl).toBeTruthy();
    expect(body.videoRecordingDurationSec).toBeGreaterThan(0);
    expect(body.videoRecordingEndedAt).toBeTruthy();
  });

  it("internal summaries endpoint returns recording info, filters by candidateId", async () => {
    stubCrossServiceFetch({ submissions: [buildSubmission()], interviewers: [] });
    const server = await getServer();
    const custToken = await makeBearerToken(CUSTOMER, ["CUSTOMER"]);
    const svcToken = await makeBearerToken(
      "00000000-0000-0000-0000-000000000000",
      ["SERVICE"],
    );

    const create = await server.inject({
      method: "POST",
      url: "/api/v1/interviews",
      headers: { authorization: `Bearer ${custToken}`, "content-type": "application/json" },
      payload: JSON.stringify(interviewPayload()),
    });
    const { id } = create.json() as { id: string };

    // Drive the interview to READY.
    await server.inject({
      method: "POST",
      url: `/api/v1/interviews/${id}/start`,
      headers: { authorization: `Bearer ${custToken}` },
    });
    await server.inject({
      method: "POST",
      url: `/api/v1/interviews/${id}/end`,
      headers: { authorization: `Bearer ${custToken}` },
    });
    // Wait for the async recording processor to settle.
    for (let attempt = 0; attempt < 20; attempt++) {
      const row = await getPrisma().interview.findUnique({ where: { id } });
      if (row?.videoRecordingStatus === "READY") break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Candidate-filtered summary returns the row with recording URL.
    const ok = await server.inject({
      method: "GET",
      url: `/api/v1/internal/interviews/summaries?ids=${id}&candidateId=${CANDIDATE}`,
      headers: { authorization: `Bearer ${svcToken}` },
    });
    expect(ok.statusCode).toBe(200);
    const okBody = ok.json() as { data: Array<Record<string, unknown>> };
    expect(okBody.data).toHaveLength(1);
    expect(okBody.data[0]?.id).toBe(id);
    expect(okBody.data[0]?.recordingStatus).toBe("READY");
    expect(okBody.data[0]?.recordingUrl).toBeTruthy();

    // Same request with a different candidateId filter → empty.
    const empty = await server.inject({
      method: "GET",
      url: `/api/v1/internal/interviews/summaries?ids=${id}&candidateId=11111111-2222-3333-4444-555555555555`,
      headers: { authorization: `Bearer ${svcToken}` },
    });
    expect(empty.statusCode).toBe(200);
    expect((empty.json() as { data: unknown[] }).data).toHaveLength(0);

    // Non-service token → 401 (requireServiceRole throws UnauthorizedError).
    const denied = await server.inject({
      method: "GET",
      url: `/api/v1/internal/interviews/summaries?ids=${id}`,
      headers: { authorization: `Bearer ${custToken}` },
    });
    expect(denied.statusCode).toBe(401);
  });

  it("outgoing event row enqueued on interview creation", async () => {
    stubCrossServiceFetch({ submissions: [buildSubmission()], interviewers: [] });
    const server = await getServer();
    const token = await makeBearerToken(CUSTOMER, ["CUSTOMER"]);

    await server.inject({
      method: "POST",
      url: "/api/v1/interviews",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify(interviewPayload()),
    });

    const events = await getPrisma().outgoingEvent.findMany({
      where: { eventType: "interview.scheduled.v1" },
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.status).toBe("PENDING");
  });
});
