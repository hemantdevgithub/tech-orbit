import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import {
  IDS,
  buildInterview,
  buildRequirement,
  buildSubmission,
  closeServer,
  defaultPlacementBody,
  getPrisma,
  getServer,
  makeBearerToken,
  resetDb,
  runIntegrationSuite,
  stubCrossServiceFetch,
} from "./helpers.js";

runIntegrationSuite("placements", () => {
  beforeAll(getServer);
  afterAll(closeServer);
  beforeEach(async () => {
    await resetDb();
    vi.restoreAllMocks();
  });

  it("W-2 placement with CRM + SRM + 2 interviewers → 6 commission rules", async () => {
    stubCrossServiceFetch({
      submissions: [buildSubmission({ attributedSrmId: IDS.srm })],
      requirements: [buildRequirement({ attributedCrmId: IDS.crm })],
      interviews: [
        buildInterview({ interviewerUserId: IDS.interviewer1 }),
        buildInterview({ interviewerUserId: IDS.interviewer2 }),
      ],
    });
    const server = await getServer();
    const token = await makeBearerToken(IDS.customerUser, ["CUSTOMER"]);

    const res = await server.inject({
      method: "POST",
      url: "/api/v1/placements",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify(defaultPlacementBody()),
    });

    expect(res.statusCode).toBe(201);
    const body = res.json() as { placement: { id: string; status: string }; rules: { data: unknown[] } };
    expect(body.placement.status).toBe("ACTIVE");

    const rules = await getPrisma().commissionRule.findMany({
      where: { placementId: body.placement.id },
    });
    expect(rules).toHaveLength(6);
    expect(rules.map((r) => r.slot).sort()).toEqual([
      "CANDIDATE_W2", "CRM", "INTERVIEWER", "INTERVIEWER", "PLATFORM", "SRM",
    ]);
  });

  it("C2C placement → MSME residual + 12% platform", async () => {
    stubCrossServiceFetch({
      submissions: [buildSubmission({
        attributedSrmId: IDS.srm,
        attributedMsmeId: IDS.msme,
      })],
      requirements: [buildRequirement({ attributedCrmId: IDS.crm })],
      interviews: [],
    });
    const server = await getServer();
    const token = await makeBearerToken(IDS.customerUser, ["CUSTOMER"]);

    const res = await server.inject({
      method: "POST",
      url: "/api/v1/placements",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify(defaultPlacementBody({
        engagementType: "C2C",
        payRateUsd: undefined,
      })),
    });

    expect(res.statusCode).toBe(201);
    const body = res.json() as { placement: { id: string } };
    const rules = await getPrisma().commissionRule.findMany({
      where: { placementId: body.placement.id },
    });
    // CRM, SRM, MSME (residual), Platform (12%) — 4 rules, no CANDIDATE_W2
    expect(rules).toHaveLength(4);
    const msme = rules.find((r) => r.slot === "MSME")!;
    expect(msme.calculation).toBe("RESIDUAL");
    expect(msme.beneficiaryMsmeId).toBe(IDS.msme);
    const platform = rules.find((r) => r.slot === "PLATFORM")!;
    expect(platform.calculation).toBe("PERCENT_OF_BILL");
    expect(platform.percentOfBillRate?.toString()).toBe("0.12");
  });

  it("placement with no CRM attribution → 4 rules (no CRM row)", async () => {
    stubCrossServiceFetch({
      submissions: [buildSubmission({ attributedSrmId: IDS.srm })],
      requirements: [buildRequirement({ attributedCrmId: null })],
      interviews: [buildInterview()],
    });
    const server = await getServer();
    const token = await makeBearerToken(IDS.customerUser, ["CUSTOMER"]);

    const res = await server.inject({
      method: "POST",
      url: "/api/v1/placements",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify(defaultPlacementBody()),
    });

    expect(res.statusCode).toBe(201);
    const body = res.json() as { placement: { id: string } };
    const rules = await getPrisma().commissionRule.findMany({ where: { placementId: body.placement.id } });
    // SRM + Candidate + Platform + 1 Interviewer = 4
    expect(rules).toHaveLength(4);
    expect(rules.find((r) => r.slot === "CRM")).toBeUndefined();
  });

  it("submission not in OFFER → 400", async () => {
    stubCrossServiceFetch({
      submissions: [buildSubmission({ status: "SCREENING" })],
      requirements: [buildRequirement()],
      interviews: [],
    });
    const server = await getServer();
    const token = await makeBearerToken(IDS.customerUser, ["CUSTOMER"]);

    const res = await server.inject({
      method: "POST",
      url: "/api/v1/placements",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify(defaultPlacementBody()),
    });
    expect(res.statusCode).toBe(400);
  });

  it("non-customer cannot create placement → 403", async () => {
    stubCrossServiceFetch({
      submissions: [buildSubmission()],
      requirements: [buildRequirement()],
      interviews: [],
    });
    const server = await getServer();
    const token = await makeBearerToken(IDS.candidate, ["CANDIDATE"]);

    const res = await server.inject({
      method: "POST",
      url: "/api/v1/placements",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify(defaultPlacementBody()),
    });
    expect(res.statusCode).toBe(403);
  });

  it("duplicate placement on same submission → 409", async () => {
    stubCrossServiceFetch({
      submissions: [buildSubmission()],
      requirements: [buildRequirement()],
      interviews: [],
    });
    const server = await getServer();
    const token = await makeBearerToken(IDS.customerUser, ["CUSTOMER"]);

    const body = JSON.stringify(defaultPlacementBody());
    await server.inject({
      method: "POST",
      url: "/api/v1/placements",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: body,
    });
    const dup = await server.inject({
      method: "POST",
      url: "/api/v1/placements",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: body,
    });
    expect(dup.statusCode).toBe(409);
  });

  it("customer can see the full Value Chain; SRM sees only their slot", async () => {
    stubCrossServiceFetch({
      submissions: [buildSubmission({ attributedSrmId: IDS.srm })],
      requirements: [buildRequirement({ attributedCrmId: IDS.crm })],
      interviews: [buildInterview()],
    });
    const server = await getServer();
    const custToken = await makeBearerToken(IDS.customerUser, ["CUSTOMER"]);

    const create = await server.inject({
      method: "POST",
      url: "/api/v1/placements",
      headers: { authorization: `Bearer ${custToken}`, "content-type": "application/json" },
      payload: JSON.stringify(defaultPlacementBody()),
    });
    const placementId = (create.json() as { placement: { id: string } }).placement.id;

    // Customer view
    const custVc = await server.inject({
      method: "GET",
      url: `/api/v1/placements/${placementId}/value-chain`,
      headers: { authorization: `Bearer ${custToken}` },
    });
    const custChain = custVc.json() as { attributedCrmId: string | null; attributedSrmId: string | null; redactedSlots: string[] };
    expect(custChain.attributedCrmId).toBe(IDS.crm);
    expect(custChain.attributedSrmId).toBe(IDS.srm);
    expect(custChain.redactedSlots).toEqual([]);

    // SRM view
    const srmToken = await makeBearerToken(IDS.srm, ["SRM"]);
    const srmVc = await server.inject({
      method: "GET",
      url: `/api/v1/placements/${placementId}/value-chain`,
      headers: { authorization: `Bearer ${srmToken}` },
    });
    const srmChain = srmVc.json() as { attributedCrmId: string | null; attributedSrmId: string | null; redactedSlots: string[] };
    expect(srmChain.attributedCrmId).toBeNull();
    expect(srmChain.attributedSrmId).toBe(IDS.srm);
    expect(srmChain.redactedSlots).toContain("CRM");
  });

  it("candidate cannot see CRM/SRM commissions", async () => {
    stubCrossServiceFetch({
      submissions: [buildSubmission({ attributedSrmId: IDS.srm })],
      requirements: [buildRequirement({ attributedCrmId: IDS.crm })],
      interviews: [],
    });
    const server = await getServer();
    const custToken = await makeBearerToken(IDS.customerUser, ["CUSTOMER"]);

    const create = await server.inject({
      method: "POST",
      url: "/api/v1/placements",
      headers: { authorization: `Bearer ${custToken}`, "content-type": "application/json" },
      payload: JSON.stringify(defaultPlacementBody()),
    });
    const placementId = (create.json() as { placement: { id: string } }).placement.id;

    const candToken = await makeBearerToken(IDS.candidate, ["CANDIDATE"]);
    const rules = await server.inject({
      method: "GET",
      url: `/api/v1/placements/${placementId}/commissions`,
      headers: { authorization: `Bearer ${candToken}` },
    });
    expect(rules.statusCode).toBe(200);
    const body = rules.json() as { data: Array<{ slot: string }> };
    const slots = body.data.map((r) => r.slot).sort();
    expect(slots).toEqual(["CANDIDATE_W2"]); // only own pay rate
  });

  it("customer ends placement → status ENDED_EARLY + endedEvent enqueued", async () => {
    stubCrossServiceFetch({
      submissions: [buildSubmission()],
      requirements: [buildRequirement()],
      interviews: [],
    });
    const server = await getServer();
    const custToken = await makeBearerToken(IDS.customerUser, ["CUSTOMER"]);

    const create = await server.inject({
      method: "POST",
      url: "/api/v1/placements",
      headers: { authorization: `Bearer ${custToken}`, "content-type": "application/json" },
      payload: JSON.stringify(defaultPlacementBody()),
    });
    const placementId = (create.json() as { placement: { id: string } }).placement.id;

    const end = await server.inject({
      method: "POST",
      url: `/api/v1/placements/${placementId}/end`,
      headers: { authorization: `Bearer ${custToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ reason: "Contract completed", status: "ENDED_COMPLETED" }),
    });
    expect(end.statusCode).toBe(200);
    expect((end.json() as { status: string }).status).toBe("ENDED_COMPLETED");

    const events = await getPrisma().outgoingEvent.findMany({
      where: { aggregateId: placementId, eventType: "placement.ended.v1" },
    });
    expect(events).toHaveLength(1);
  });

  it("outbox event placement.created.v1 is enqueued on creation", async () => {
    stubCrossServiceFetch({
      submissions: [buildSubmission()],
      requirements: [buildRequirement()],
      interviews: [],
    });
    const server = await getServer();
    const token = await makeBearerToken(IDS.customerUser, ["CUSTOMER"]);

    await server.inject({
      method: "POST",
      url: "/api/v1/placements",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify(defaultPlacementBody()),
    });
    const events = await getPrisma().outgoingEvent.findMany({
      where: { eventType: "placement.created.v1" },
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.status).toBe("PENDING");
  });
});
