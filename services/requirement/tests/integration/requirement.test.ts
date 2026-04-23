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

const CUSTOMER_A = "11111111-1111-1111-1111-111111111111";
const CUSTOMER_B = "22222222-2222-2222-2222-222222222222";
const CANDIDATE = "33333333-3333-3333-3333-333333333333";
const ADMIN = "44444444-4444-4444-4444-444444444444";

runIntegrationSuite("Requirement CRUD + lifecycle", () => {
  beforeAll(getServer);
  afterAll(closeServer);
  beforeEach(async () => {
    await resetDb();
    vi.restoreAllMocks();
  });

  it("POST /api/v1/requirements creates a draft as a customer", async () => {
    stubProfileCustomer({ primaryUserId: CUSTOMER_A });
    const server = await getServer();
    const token = await makeBearerToken(CUSTOMER_A, ["CUSTOMER"]);

    const res = await server.inject({
      method: "POST",
      url: "/api/v1/requirements",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify(buildRequirementPayload({ customerCompanyId: CUSTOMER_A })),
    });

    expect(res.statusCode).toBe(201);
    const body = res.json() as Record<string, unknown>;
    expect(body.id).toBeDefined();
    expect(body.status).toBe("DRAFT");
    expect(body.createdByUserId).toBe(CUSTOMER_A);

    const row = await getPrisma().requirement.findUnique({
      where: { id: body.id as string },
    });
    expect(row).not.toBeNull();
    expect(row?.status).toBe("DRAFT");
    expect(row?.attributedCrmId).toBeNull();
  });

  it("auto-attributes the customer's CRM when the profile has one", async () => {
    const CRM_ID = "55555555-5555-5555-5555-555555555555";
    stubProfileCustomer({ primaryUserId: CUSTOMER_A, attributedCrmUserId: CRM_ID });
    const server = await getServer();
    const token = await makeBearerToken(CUSTOMER_A, ["CUSTOMER"]);

    const res = await server.inject({
      method: "POST",
      url: "/api/v1/requirements",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify(buildRequirementPayload({ customerCompanyId: CUSTOMER_A })),
    });

    expect(res.statusCode).toBe(201);
    const body = res.json() as Record<string, unknown>;
    expect(body.attributedCrmId).toBe(CRM_ID);
  });

  it("rejects create from a non-customer role", async () => {
    const server = await getServer();
    const token = await makeBearerToken(CANDIDATE, ["CANDIDATE"]);

    const res = await server.inject({
      method: "POST",
      url: "/api/v1/requirements",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify(buildRequirementPayload({ customerCompanyId: CANDIDATE })),
    });

    expect(res.statusCode).toBe(403);
  });

  it("rejects create when customerCompanyId is not the caller", async () => {
    stubProfileCustomer({ primaryUserId: CUSTOMER_B });
    const server = await getServer();
    const token = await makeBearerToken(CUSTOMER_A, ["CUSTOMER"]);

    const res = await server.inject({
      method: "POST",
      url: "/api/v1/requirements",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify(buildRequirementPayload({ customerCompanyId: CUSTOMER_B })),
    });

    expect(res.statusCode).toBe(403);
  });

  it("publish transitions DRAFT → OPEN, sets publishedAt, and enqueues an event", async () => {
    stubProfileCustomer({ primaryUserId: CUSTOMER_A });
    const server = await getServer();
    const token = await makeBearerToken(CUSTOMER_A, ["CUSTOMER"]);

    const create = await server.inject({
      method: "POST",
      url: "/api/v1/requirements",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify(buildRequirementPayload({ customerCompanyId: CUSTOMER_A })),
    });
    const { id } = create.json() as { id: string };

    const publish = await server.inject({
      method: "POST",
      url: `/api/v1/requirements/${id}/publish`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(publish.statusCode).toBe(200);
    const body = publish.json() as Record<string, unknown>;
    expect(body.status).toBe("OPEN");
    expect(body.publishedAt).not.toBeNull();

    const events = await getPrisma().outgoingEvent.findMany({
      where: { aggregateId: id, eventType: "requirement.published.v1" },
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.status).toBe("PENDING");
  });

  it("close transitions to CLOSED, records reason, enqueues closed event", async () => {
    stubProfileCustomer({ primaryUserId: CUSTOMER_A });
    const server = await getServer();
    const token = await makeBearerToken(CUSTOMER_A, ["CUSTOMER"]);

    const create = await server.inject({
      method: "POST",
      url: "/api/v1/requirements",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify(buildRequirementPayload({ customerCompanyId: CUSTOMER_A })),
    });
    const { id } = create.json() as { id: string };

    await server.inject({
      method: "POST",
      url: `/api/v1/requirements/${id}/publish`,
      headers: { authorization: `Bearer ${token}` },
    });

    const close = await server.inject({
      method: "POST",
      url: `/api/v1/requirements/${id}/close`,
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify({ reason: "Position filled internally" }),
    });
    expect(close.statusCode).toBe(200);
    const body = close.json() as Record<string, unknown>;
    expect(body.status).toBe("CLOSED");
    expect(body.closedAt).not.toBeNull();
    expect(body.closedReason).toBe("Position filled internally");

    const closedEvents = await getPrisma().outgoingEvent.findMany({
      where: { aggregateId: id, eventType: "requirement.closed.v1" },
    });
    expect(closedEvents).toHaveLength(1);
  });

  it("list filters by status and techStack, and hides drafts from non-owners", async () => {
    stubProfileCustomer({ primaryUserId: CUSTOMER_A });
    const server = await getServer();
    const ownerToken = await makeBearerToken(CUSTOMER_A, ["CUSTOMER"]);

    // Owner creates a draft + a published one.
    const draft = await server.inject({
      method: "POST",
      url: "/api/v1/requirements",
      headers: { authorization: `Bearer ${ownerToken}`, "content-type": "application/json" },
      payload: JSON.stringify(buildRequirementPayload({ customerCompanyId: CUSTOMER_A, title: "DraftOne" })),
    });
    const draftId = (draft.json() as { id: string }).id;

    const open = await server.inject({
      method: "POST",
      url: "/api/v1/requirements",
      headers: { authorization: `Bearer ${ownerToken}`, "content-type": "application/json" },
      payload: JSON.stringify(buildRequirementPayload({ customerCompanyId: CUSTOMER_A, title: "OpenOne", techStack: ["Python"] })),
    });
    const openId = (open.json() as { id: string }).id;
    await server.inject({
      method: "POST",
      url: `/api/v1/requirements/${openId}/publish`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    // Different user — a candidate — should see only the published one.
    const candidateToken = await makeBearerToken(CANDIDATE, ["CANDIDATE"]);
    const list = await server.inject({
      method: "GET",
      url: "/api/v1/requirements?status=OPEN",
      headers: { authorization: `Bearer ${candidateToken}` },
    });
    expect(list.statusCode).toBe(200);
    const body = list.json() as { data: Record<string, string>[] };
    const titles = body.data.map((r) => r.title);
    expect(titles).toContain("OpenOne");
    expect(titles).not.toContain("DraftOne");

    // Filter by techStack — OpenOne has Python, so tech=Python includes it
    // and tech=Rust excludes it.
    const tsMatch = await server.inject({
      method: "GET",
      url: "/api/v1/requirements?techStack=Python",
      headers: { authorization: `Bearer ${candidateToken}` },
    });
    expect((tsMatch.json() as { data: unknown[] }).data.length).toBe(1);

    const tsNone = await server.inject({
      method: "GET",
      url: "/api/v1/requirements?techStack=Rust",
      headers: { authorization: `Bearer ${candidateToken}` },
    });
    expect((tsNone.json() as { data: unknown[] }).data.length).toBe(0);

    // Draft is visible to its owner via findById.
    const ownerGet = await server.inject({
      method: "GET",
      url: `/api/v1/requirements/${draftId}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    expect(ownerGet.statusCode).toBe(200);

    // Draft is NOT visible to the candidate.
    const candidateGet = await server.inject({
      method: "GET",
      url: `/api/v1/requirements/${draftId}`,
      headers: { authorization: `Bearer ${candidateToken}` },
    });
    expect(candidateGet.statusCode).toBe(403);
  });

  it("blindPosting redacts customerCompanyId and createdByUserId for non-owners", async () => {
    stubProfileCustomer({ primaryUserId: CUSTOMER_A });
    const server = await getServer();
    const ownerToken = await makeBearerToken(CUSTOMER_A, ["CUSTOMER"]);

    const create = await server.inject({
      method: "POST",
      url: "/api/v1/requirements",
      headers: { authorization: `Bearer ${ownerToken}`, "content-type": "application/json" },
      payload: JSON.stringify(
        buildRequirementPayload({ customerCompanyId: CUSTOMER_A, blindPosting: true }),
      ),
    });
    const { id } = create.json() as { id: string };
    await server.inject({
      method: "POST",
      url: `/api/v1/requirements/${id}/publish`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    // Owner sees full identity.
    const ownerView = await server.inject({
      method: "GET",
      url: `/api/v1/requirements/${id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    const ownerBody = ownerView.json() as Record<string, string | null>;
    expect(ownerBody.customerCompanyId).toBe(CUSTOMER_A);
    expect(ownerBody.createdByUserId).toBe(CUSTOMER_A);

    // A candidate sees redacted identity.
    const candidateToken = await makeBearerToken(CANDIDATE, ["CANDIDATE"]);
    const candidateView = await server.inject({
      method: "GET",
      url: `/api/v1/requirements/${id}`,
      headers: { authorization: `Bearer ${candidateToken}` },
    });
    const candidateBody = candidateView.json() as Record<string, string | null>;
    expect(candidateBody.customerCompanyId).toBeNull();
    expect(candidateBody.createdByUserId).toBeNull();
    expect(candidateBody.blindPosting).toBe(true);

    // Admin sees full identity.
    const adminToken = await makeBearerToken(ADMIN, ["ADMIN"]);
    const adminView = await server.inject({
      method: "GET",
      url: `/api/v1/requirements/${id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const adminBody = adminView.json() as Record<string, string | null>;
    expect(adminBody.customerCompanyId).toBe(CUSTOMER_A);
  });

  it("returns 401 without a token", async () => {
    const server = await getServer();
    const res = await server.inject({ method: "GET", url: "/api/v1/requirements" });
    expect(res.statusCode).toBe(401);
  });
});
