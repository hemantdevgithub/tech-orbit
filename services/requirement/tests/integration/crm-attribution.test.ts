import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import {
  buildRequirementPayload,
  closeServer,
  getPrisma,
  getServer,
  makeBearerToken,
  resetDb,
  runIntegrationSuite,
  stubProfileCustomer,
} from "./helpers.js";

const CUSTOMER = "11111111-1111-1111-1111-111111111111";
const CRM_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const CRM_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

async function seedPublishedRequirement(
  attributedCrmUserId: string | null = null,
): Promise<string> {
  stubProfileCustomer({ primaryUserId: CUSTOMER, attributedCrmUserId });
  const server = await getServer();
  const token = await makeBearerToken(CUSTOMER, ["CUSTOMER"]);
  const create = await server.inject({
    method: "POST",
    url: "/api/v1/requirements",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    payload: JSON.stringify(buildRequirementPayload()),
  });
  const { id } = create.json() as { id: string };
  await server.inject({
    method: "POST",
    url: `/api/v1/requirements/${id}/publish`,
    headers: { authorization: `Bearer ${token}` },
  });
  return id;
}

runIntegrationSuite("CRM attribution", () => {
  beforeAll(getServer);
  afterAll(closeServer);
  beforeEach(async () => {
    await resetDb();
    vi.restoreAllMocks();
  });

  it("CRM claim creates a PENDING attribution request", async () => {
    const requirementId = await seedPublishedRequirement();
    const server = await getServer();
    const crmToken = await makeBearerToken(CRM_A, ["CRM"]);

    const res = await server.inject({
      method: "POST",
      url: `/api/v1/requirements/${requirementId}/attribute-crm`,
      headers: { authorization: `Bearer ${crmToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ crmUserId: CRM_A }),
    });

    expect(res.statusCode).toBe(202); // pending
    const body = res.json() as { kind: string; request?: Record<string, unknown> };
    expect(body.kind).toBe("pending");
    expect(body.request?.status).toBe("PENDING");
    expect(body.request?.crmUserId).toBe(CRM_A);

    const pending = await getPrisma().crmAttributionRequest.findMany({
      where: { requirementId, status: "PENDING" },
    });
    expect(pending).toHaveLength(1);
  });

  it("customer approval flips the request to APPROVED and stamps attributedCrmId", async () => {
    const requirementId = await seedPublishedRequirement();
    const server = await getServer();
    const crmToken = await makeBearerToken(CRM_A, ["CRM"]);

    const claim = await server.inject({
      method: "POST",
      url: `/api/v1/requirements/${requirementId}/attribute-crm`,
      headers: { authorization: `Bearer ${crmToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ crmUserId: CRM_A }),
    });
    const requestId = (claim.json() as { request: { id: string } }).request.id;

    const customerToken = await makeBearerToken(CUSTOMER, ["CUSTOMER"]);
    const approve = await server.inject({
      method: "POST",
      url: `/api/v1/crm-attribution-requests/${requestId}/approve`,
      headers: { authorization: `Bearer ${customerToken}` },
    });
    expect(approve.statusCode).toBe(200);
    const approved = approve.json() as Record<string, unknown>;
    expect(approved.status).toBe("APPROVED");
    expect(approved.approvedBy).toBe(CUSTOMER);

    const req = await getPrisma().requirement.findUnique({
      where: { id: requirementId },
    });
    expect(req?.attributedCrmId).toBe(CRM_A);
  });

  it("customer reject flips to REJECTED without touching attributedCrmId", async () => {
    const requirementId = await seedPublishedRequirement();
    const server = await getServer();
    const crmToken = await makeBearerToken(CRM_A, ["CRM"]);

    const claim = await server.inject({
      method: "POST",
      url: `/api/v1/requirements/${requirementId}/attribute-crm`,
      headers: { authorization: `Bearer ${crmToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ crmUserId: CRM_A }),
    });
    const requestId = (claim.json() as { request: { id: string } }).request.id;

    const customerToken = await makeBearerToken(CUSTOMER, ["CUSTOMER"]);
    const reject = await server.inject({
      method: "POST",
      url: `/api/v1/crm-attribution-requests/${requestId}/reject`,
      headers: { authorization: `Bearer ${customerToken}` },
    });
    expect(reject.statusCode).toBe(200);
    const rejected = reject.json() as Record<string, unknown>;
    expect(rejected.status).toBe("REJECTED");

    const req = await getPrisma().requirement.findUnique({
      where: { id: requirementId },
    });
    expect(req?.attributedCrmId).toBeNull();
  });

  it("auto-attribute on create: already-attributed customer → claim just confirms", async () => {
    // Customer already has CRM_A on their profile; requirement is created
    // with attributedCrmId=CRM_A. When CRM_A claims, they should get
    // "attributed" immediately (no pending request).
    const requirementId = await seedPublishedRequirement(CRM_A);
    const server = await getServer();
    const crmToken = await makeBearerToken(CRM_A, ["CRM"]);

    const res = await server.inject({
      method: "POST",
      url: `/api/v1/requirements/${requirementId}/attribute-crm`,
      headers: { authorization: `Bearer ${crmToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ crmUserId: CRM_A }),
    });
    expect(res.statusCode).toBe(200); // attributed
    const body = res.json() as { kind: string; requirement?: Record<string, unknown> };
    expect(body.kind).toBe("attributed");
    expect(body.requirement?.attributedCrmId).toBe(CRM_A);

    // And no pending request was written.
    const pending = await getPrisma().crmAttributionRequest.findMany({
      where: { requirementId },
    });
    expect(pending).toHaveLength(0);
  });

  it("a different CRM claiming an already-attributed requirement gets 409", async () => {
    const requirementId = await seedPublishedRequirement(CRM_A);
    const server = await getServer();
    const crmBToken = await makeBearerToken(CRM_B, ["CRM"]);

    const res = await server.inject({
      method: "POST",
      url: `/api/v1/requirements/${requirementId}/attribute-crm`,
      headers: { authorization: `Bearer ${crmBToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ crmUserId: CRM_B }),
    });
    expect(res.statusCode).toBe(409);
  });

  it("customer lists only their own pending queue", async () => {
    const requirementId = await seedPublishedRequirement();
    const server = await getServer();
    const crmToken = await makeBearerToken(CRM_A, ["CRM"]);

    await server.inject({
      method: "POST",
      url: `/api/v1/requirements/${requirementId}/attribute-crm`,
      headers: { authorization: `Bearer ${crmToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ crmUserId: CRM_A }),
    });

    const customerToken = await makeBearerToken(CUSTOMER, ["CUSTOMER"]);
    const list = await server.inject({
      method: "GET",
      url: "/api/v1/crm-attribution-requests",
      headers: { authorization: `Bearer ${customerToken}` },
    });
    expect(list.statusCode).toBe(200);
    const body = list.json() as { data: Record<string, unknown>[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.crmUserId).toBe(CRM_A);
  });
});
