import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import {
  IDS,
  closeServer,
  getPrisma,
  getServer,
  makeBearerToken,
  resetDb,
  runIntegrationSuite,
  stubIdentityFetch,
} from "./helpers.js";

runIntegrationSuite("Admin API", () => {
  beforeAll(async () => {
    await getServer();
  });
  afterAll(async () => {
    await closeServer();
  });
  beforeEach(async () => {
    await resetDb();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Role applications ─────────────────────────────────────────────────────

  it("1. approve role application → identity-svc addRole called, audit logged, event enqueued", async () => {
    const db = getPrisma();
    const application = await db.roleApplication.create({
      data: {
        userId: IDS.candidate,
        requestedRole: "CRM",
        applicationData: { linkedinUrl: "https://linkedin.com/in/test" },
      },
    });

    const { calls } = stubIdentityFetch({});
    const app = await getServer();
    const token = await makeBearerToken(IDS.admin, ["ADMIN"]);

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/role-applications/${application.id}/approve`,
      headers: { authorization: `Bearer ${token}` },
      payload: { reviewNotes: "Looks good" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("APPROVED");

    expect(calls.addRole).toEqual([{ userId: IDS.candidate, roleType: "CRM" }]);
    const audit = await db.auditLog.findMany();
    expect(audit).toHaveLength(1);
    expect(audit[0]!.action).toBe("ROLE_APPLICATION_APPROVED");
    const events = await db.outgoingEvent.findMany();
    expect(events).toHaveLength(1);
    expect(events[0]!.eventType).toBe("role.approved.v1");
  });

  it("2. reject application → status REJECTED, audit logged", async () => {
    const db = getPrisma();
    const application = await db.roleApplication.create({
      data: {
        userId: IDS.candidate,
        requestedRole: "CRM",
        applicationData: {},
      },
    });

    stubIdentityFetch({});
    const app = await getServer();
    const token = await makeBearerToken(IDS.admin, ["ADMIN"]);

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/role-applications/${application.id}/reject`,
      headers: { authorization: `Bearer ${token}` },
      payload: { reviewNotes: "Incomplete application" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("REJECTED");

    const audit = await db.auditLog.findMany();
    expect(audit[0]!.action).toBe("ROLE_APPLICATION_REJECTED");
  });

  // ─── Disputes ──────────────────────────────────────────────────────────────

  it("3. create dispute → stored in DB, raised.v1 event enqueued", async () => {
    const app = await getServer();
    const token = await makeBearerToken(IDS.candidate, ["CANDIDATE"]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/disputes",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        type: "TIMESHEET",
        contextType: "TIMESHEET",
        contextId: "11111111-1111-1111-1111-111111111111",
        description: "Rejected in error",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.raisedBy).toBe(IDS.candidate);
    expect(body.status).toBe("OPEN");

    const db = getPrisma();
    const events = await db.outgoingEvent.findMany();
    expect(events[0]!.eventType).toBe("dispute.raised.v1");
  });

  it("4. add dispute note → stored with author", async () => {
    const db = getPrisma();
    const dispute = await db.dispute.create({
      data: {
        type: "CONDUCT",
        contextType: "PLACEMENT",
        contextId: "22222222-2222-2222-2222-222222222222",
        raisedBy: IDS.candidate,
        description: "Concerns about behavior on project",
      },
    });

    const app = await getServer();
    const token = await makeBearerToken(IDS.admin, ["ADMIN"]);

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/disputes/${dispute.id}/notes`,
      headers: { authorization: `Bearer ${token}` },
      payload: { content: "Investigating" },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().authorId).toBe(IDS.admin);

    const notes = await db.disputeNote.findMany({ where: { disputeId: dispute.id } });
    expect(notes).toHaveLength(1);
  });

  it("5. resolve dispute → status RESOLVED, audit logged, event enqueued", async () => {
    const db = getPrisma();
    const dispute = await db.dispute.create({
      data: {
        type: "COMMISSION",
        contextType: "COMMISSION_PAYOUT",
        contextId: "33333333-3333-3333-3333-333333333333",
        raisedBy: IDS.candidate,
        description: "Wrong commission paid",
      },
    });

    const app = await getServer();
    const token = await makeBearerToken(IDS.admin, ["ADMIN"]);

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/disputes/${dispute.id}/resolve`,
      headers: { authorization: `Bearer ${token}` },
      payload: { resolution: "Refund processed" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("RESOLVED");
    expect(res.json().resolvedBy).toBe(IDS.admin);

    const audit = await db.auditLog.findMany();
    expect(audit[0]!.action).toBe("DISPUTE_RESOLVED");
    const events = await db.outgoingEvent.findMany();
    expect(events[0]!.eventType).toBe("dispute.resolved.v1");
  });

  // ─── User management ───────────────────────────────────────────────────────

  it("6. suspend user → identity-svc called with SUSPENDED, audit logged", async () => {
    const { calls } = stubIdentityFetch({});
    const app = await getServer();
    const token = await makeBearerToken(IDS.admin, ["ADMIN"]);

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/admin/users/${IDS.candidate}/suspend`,
      headers: { authorization: `Bearer ${token}` },
      payload: { reason: "Repeated violations", duration: "THIRTY_DAYS" },
    });

    expect(res.statusCode).toBe(200);
    expect(calls.status).toHaveLength(1);
    expect(calls.status[0]!.body.status).toBe("SUSPENDED");
    expect(calls.status[0]!.body.duration).toBe("THIRTY_DAYS");

    const audit = await getPrisma().auditLog.findMany();
    expect(audit[0]!.action).toBe("USER_SUSPENDED");
  });

  it("7. search users → forwards to identity-svc", async () => {
    const { calls } = stubIdentityFetch({
      searchResult: [
        {
          id: IDS.candidate,
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          status: "ACTIVE",
          roles: ["CANDIDATE"],
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const app = await getServer();
    const token = await makeBearerToken(IDS.admin, ["ADMIN"]);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/users/search?q=test",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(1);
    expect(res.json().data[0].email).toBe("test@example.com");
    expect(calls.search).toEqual([{ q: "test" }]);
  });

  // ─── Authorization ─────────────────────────────────────────────────────────

  it("8. non-admin cannot approve application → 403", async () => {
    const db = getPrisma();
    const application = await db.roleApplication.create({
      data: { userId: IDS.candidate, requestedRole: "CRM", applicationData: {} },
    });

    const app = await getServer();
    const token = await makeBearerToken(IDS.stranger, ["CUSTOMER"]);

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/role-applications/${application.id}/approve`,
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(res.statusCode).toBe(403);
  });

  it("9. non-admin cannot suspend user → 403", async () => {
    stubIdentityFetch({});
    const app = await getServer();
    const token = await makeBearerToken(IDS.stranger, ["CUSTOMER"]);

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/admin/users/${IDS.candidate}/suspend`,
      headers: { authorization: `Bearer ${token}` },
      payload: { reason: "because", duration: "SEVEN_DAYS" },
    });
    expect(res.statusCode).toBe(403);
  });
});
