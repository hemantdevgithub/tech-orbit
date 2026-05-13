import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import {
  IDS,
  buildPlacement,
  closeServer,
  fullW2Rules,
  getPrisma,
  getServer,
  insertApprovedTimesheet,
  makeBearerToken,
  resetDb,
  runIntegrationSuite,
  stubCrossServiceFetch,
} from "./helpers.js";

// Dynamic billing window — Monday 3 weeks ago (always in the past so the
// service's "can't submit a future week" guard doesn't reject in tests).
function mondayNWeeksAgo(n: number): Date {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day) - 7 * n);
  return d;
}
const BILLING_START = mondayNWeeksAgo(3);
const BILLING_END = new Date(BILLING_START);
BILLING_END.setUTCDate(BILLING_END.getUTCDate() + 6);
BILLING_END.setUTCHours(23, 59, 59, 999);

runIntegrationSuite("payments", () => {
  beforeAll(getServer);
  afterAll(closeServer);
  beforeEach(async () => {
    await resetDb();
    vi.restoreAllMocks();
  });

  it("candidate submits timesheet — 201, status SUBMITTED", async () => {
    stubCrossServiceFetch({
      placements: [buildPlacement()],
      commissionRules: fullW2Rules(IDS.placement),
    });
    const server = await getServer();
    const token = await makeBearerToken(IDS.candidate, ["CANDIDATE"]);

    const res = await server.inject({
      method: "POST",
      url: "/api/v1/timesheets",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      payload: JSON.stringify({
        placementId: IDS.placement,
        weekStartDate: BILLING_START.toISOString(),
        hoursWorked: 40,
        description: "Feature work + standups",
      }),
    });

    expect(res.statusCode).toBe(201);
    const body = res.json() as { status: string; hoursWorked: number };
    expect(body.status).toBe("SUBMITTED");
    expect(body.hoursWorked).toBe(40);
  });

  it("customer approves timesheet — status APPROVED + event", async () => {
    stubCrossServiceFetch({
      placements: [buildPlacement()],
      commissionRules: fullW2Rules(IDS.placement),
    });
    const server = await getServer();
    const candToken = await makeBearerToken(IDS.candidate, ["CANDIDATE"]);

    const create = await server.inject({
      method: "POST",
      url: "/api/v1/timesheets",
      headers: { authorization: `Bearer ${candToken}`, "content-type": "application/json" },
      payload: JSON.stringify({
        placementId: IDS.placement,
        weekStartDate: BILLING_START.toISOString(),
        hoursWorked: 40,
      }),
    });
    const tsId = (create.json() as { id: string }).id;

    const custToken = await makeBearerToken(IDS.customer, ["CUSTOMER"]);
    const approve = await server.inject({
      method: "POST",
      url: `/api/v1/timesheets/${tsId}/approve`,
      headers: { authorization: `Bearer ${custToken}` },
    });
    expect(approve.statusCode).toBe(200);
    expect((approve.json() as { status: string }).status).toBe("APPROVED");

    const events = await getPrisma().outgoingEvent.findMany({
      where: { eventType: "timesheet.approved.v1" },
    });
    expect(events).toHaveLength(1);
  });

  it("reject timesheet — status REJECTED with reason", async () => {
    stubCrossServiceFetch({
      placements: [buildPlacement()],
      commissionRules: fullW2Rules(IDS.placement),
    });
    const server = await getServer();
    const candToken = await makeBearerToken(IDS.candidate, ["CANDIDATE"]);

    const create = await server.inject({
      method: "POST",
      url: "/api/v1/timesheets",
      headers: { authorization: `Bearer ${candToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ placementId: IDS.placement, weekStartDate: BILLING_START.toISOString(), hoursWorked: 40 }),
    });
    const tsId = (create.json() as { id: string }).id;

    const custToken = await makeBearerToken(IDS.customer, ["CUSTOMER"]);
    const reject = await server.inject({
      method: "POST",
      url: `/api/v1/timesheets/${tsId}/reject`,
      headers: { authorization: `Bearer ${custToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ reason: "Hours seem high" }),
    });
    expect(reject.statusCode).toBe(200);
    const body = reject.json() as { status: string; rejectionReason: string };
    expect(body.status).toBe("REJECTED");
    expect(body.rejectionReason).toBe("Hours seem high");
  });

  it("non-customer cannot approve timesheet → 403", async () => {
    stubCrossServiceFetch({
      placements: [buildPlacement()],
      commissionRules: fullW2Rules(IDS.placement),
    });
    const server = await getServer();
    const candToken = await makeBearerToken(IDS.candidate, ["CANDIDATE"]);

    const create = await server.inject({
      method: "POST",
      url: "/api/v1/timesheets",
      headers: { authorization: `Bearer ${candToken}`, "content-type": "application/json" },
      payload: JSON.stringify({ placementId: IDS.placement, weekStartDate: BILLING_START.toISOString(), hoursWorked: 40 }),
    });
    const tsId = (create.json() as { id: string }).id;

    // Candidate tries to self-approve
    const res = await server.inject({
      method: "POST",
      url: `/api/v1/timesheets/${tsId}/approve`,
      headers: { authorization: `Bearer ${candToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it("generateWeeklyInvoices produces Invoice + line items + 4 payouts (W-2, CRM+SRM)", async () => {
    stubCrossServiceFetch({
      placements: [buildPlacement()],
      commissionRules: fullW2Rules(IDS.placement),
    });
    await insertApprovedTimesheet({
      placementId: IDS.placement,
      candidateId: IDS.candidate,
      weekStartDate: BILLING_START,
      hours: 40,
      approverUserId: IDS.customer,
    });

    const { createInvoiceGeneratorService } = await import("../../src/services/invoice-generator.service.js");
    const { createPlacementApi } = await import("../../src/lib/placement-api.js");
    const { createServiceTokenSigner } = await import("../../src/lib/service-token.js");
    const signer = createServiceTokenSigner(process.env.JWT_PRIVATE_KEY!, "payments-test");
    const placementApi = createPlacementApi(process.env.PLACEMENT_SVC_URL!, signer);
    const gen = createInvoiceGeneratorService({
      placementApi,
      logger: { info: () => undefined, warn: () => undefined },
    });

    const result = await gen.generateWeeklyInvoices(BILLING_START, BILLING_END);
    expect(result.invoicesCreated).toBe(1);

    const invoices = await getPrisma().invoice.findMany({
      where: { invoiceType: "WEEKLY_HOURS" },
      include: { lineItems: true, commissionPayouts: true },
    });
    expect(invoices).toHaveLength(1);
    const inv = invoices[0]!;

    // $120 × 40 = $4,800
    expect(Number(inv.totalUsd)).toBe(4800);
    expect(inv.lineItems).toHaveLength(1);
    expect(Number(inv.lineItems[0]!.amountUsd)).toBe(4800);
    expect(inv.status).toBe("SENT"); // auto-sent

    const payouts = inv.commissionPayouts;
    expect(payouts).toHaveLength(4);
    const bySlot = new Map(payouts.map((p) => [p.slot, Number(p.amountUsd)]));
    expect(bySlot.get("CRM")).toBe(384);
    expect(bySlot.get("SRM")).toBe(240);
    expect(bySlot.get("CANDIDATE_W2")).toBe(3600);
    expect(bySlot.get("PLATFORM")).toBe(576);

    // Sum = invoice total
    const sum = payouts.reduce((s, p) => s + Number(p.amountUsd), 0);
    expect(sum).toBe(4800);
  });

  it("invoice generation is idempotent (running twice = same invoice)", async () => {
    stubCrossServiceFetch({
      placements: [buildPlacement()],
      commissionRules: fullW2Rules(IDS.placement),
    });
    await insertApprovedTimesheet({
      placementId: IDS.placement,
      candidateId: IDS.candidate,
      weekStartDate: BILLING_START,
      hours: 40,
      approverUserId: IDS.customer,
    });

    const { createInvoiceGeneratorService } = await import("../../src/services/invoice-generator.service.js");
    const { createPlacementApi } = await import("../../src/lib/placement-api.js");
    const { createServiceTokenSigner } = await import("../../src/lib/service-token.js");
    const signer = createServiceTokenSigner(process.env.JWT_PRIVATE_KEY!, "payments-test");
    const placementApi = createPlacementApi(process.env.PLACEMENT_SVC_URL!, signer);
    const gen = createInvoiceGeneratorService({
      placementApi,
      logger: { info: () => undefined, warn: () => undefined },
    });

    const first = await gen.generateWeeklyInvoices(BILLING_START, BILLING_END);
    const second = await gen.generateWeeklyInvoices(BILLING_START, BILLING_END);

    expect(first.invoicesCreated).toBe(1);
    expect(second.invoicesSkipped).toBe(1);

    const invoices = await getPrisma().invoice.findMany({
      where: { invoiceType: "WEEKLY_HOURS" },
    });
    expect(invoices).toHaveLength(1);
  });

  it("placement without CRM → platform absorbs (payout total still = invoice total)", async () => {
    stubCrossServiceFetch({
      placements: [buildPlacement()],
      commissionRules: fullW2Rules(IDS.placement, { withCrm: false }),
    });
    await insertApprovedTimesheet({
      placementId: IDS.placement,
      candidateId: IDS.candidate,
      weekStartDate: BILLING_START,
      hours: 40,
      approverUserId: IDS.customer,
    });

    const { createInvoiceGeneratorService } = await import("../../src/services/invoice-generator.service.js");
    const { createPlacementApi } = await import("../../src/lib/placement-api.js");
    const { createServiceTokenSigner } = await import("../../src/lib/service-token.js");
    const signer = createServiceTokenSigner(process.env.JWT_PRIVATE_KEY!, "payments-test");
    const placementApi = createPlacementApi(process.env.PLACEMENT_SVC_URL!, signer);
    const gen = createInvoiceGeneratorService({
      placementApi,
      logger: { info: () => undefined, warn: () => undefined },
    });

    await gen.generateWeeklyInvoices(BILLING_START, BILLING_END);
    const inv = await getPrisma().invoice.findFirst({
      include: { commissionPayouts: true },
    });
    expect(inv).not.toBeNull();

    const bySlot = new Map(inv!.commissionPayouts.map((p) => [p.slot, Number(p.amountUsd)]));
    expect(bySlot.get("CRM")).toBeUndefined(); // no CRM rule = no CRM payout
    expect(bySlot.get("SRM")).toBe(240);
    expect(bySlot.get("CANDIDATE_W2")).toBe(3600);
    // Platform residual = $4,800 - $240 - $3,600 = $960 (absorbs the 8% CRM slot)
    expect(bySlot.get("PLATFORM")).toBe(960);

    const total = inv!.commissionPayouts.reduce((s, p) => s + Number(p.amountUsd), 0);
    expect(total).toBe(4800);
  });

  it("generateInterviewerFeesInvoice creates one-time $150 invoice + payout", async () => {
    stubCrossServiceFetch({
      placements: [buildPlacement()],
      commissionRules: fullW2Rules(IDS.placement, { withInterviewer: true }),
    });

    const { createInvoiceGeneratorService } = await import("../../src/services/invoice-generator.service.js");
    const { createPlacementApi } = await import("../../src/lib/placement-api.js");
    const { createServiceTokenSigner } = await import("../../src/lib/service-token.js");
    const signer = createServiceTokenSigner(process.env.JWT_PRIVATE_KEY!, "payments-test");
    const placementApi = createPlacementApi(process.env.PLACEMENT_SVC_URL!, signer);
    const gen = createInvoiceGeneratorService({
      placementApi,
      logger: { info: () => undefined, warn: () => undefined },
    });

    const result = await gen.generateInterviewerFeesInvoice(IDS.placement);
    expect(result.created).toBe(true);
    expect(result.totalUsd).toBe(150);

    const inv = await getPrisma().invoice.findFirst({
      where: { invoiceType: "INTERVIEWER_FEES" },
      include: { lineItems: true, commissionPayouts: true },
    });
    expect(inv).not.toBeNull();
    expect(inv!.lineItems).toHaveLength(1);
    expect(Number(inv!.lineItems[0]!.amountUsd)).toBe(150);
    expect(inv!.commissionPayouts).toHaveLength(1);
    expect(inv!.commissionPayouts[0]!.slot).toBe("INTERVIEWER");
    expect(Number(inv!.commissionPayouts[0]!.amountUsd)).toBe(150);
  });

  it("customer can mark their own SENT invoice as paid (mock pay flow)", async () => {
    stubCrossServiceFetch({
      placements: [buildPlacement()],
      commissionRules: fullW2Rules(IDS.placement),
      customerPrimaryUsers: [{ primaryUserId: IDS.customer, id: IDS.company }],
    });
    await insertApprovedTimesheet({
      placementId: IDS.placement,
      candidateId: IDS.candidate,
      weekStartDate: BILLING_START,
      hours: 40,
      approverUserId: IDS.customer,
    });

    const { createInvoiceGeneratorService } = await import("../../src/services/invoice-generator.service.js");
    const { createPlacementApi } = await import("../../src/lib/placement-api.js");
    const { createServiceTokenSigner } = await import("../../src/lib/service-token.js");
    const signer = createServiceTokenSigner(process.env.JWT_PRIVATE_KEY!, "payments-test");
    const placementApi = createPlacementApi(process.env.PLACEMENT_SVC_URL!, signer);
    const gen = createInvoiceGeneratorService({
      placementApi,
      logger: { info: () => undefined, warn: () => undefined },
    });
    await gen.generateWeeklyInvoices(BILLING_START, BILLING_END);

    const inv = await getPrisma().invoice.findFirstOrThrow({
      where: { customerCompanyId: IDS.company, invoiceType: "WEEKLY_HOURS" },
    });
    expect(inv.status).toBe("SENT");

    const server = await getServer();
    const custToken = await makeBearerToken(IDS.customer, ["CUSTOMER"]);

    const res = await server.inject({
      method: "POST",
      url: `/api/v1/invoices/${inv.id}/mark-paid`,
      headers: { authorization: `Bearer ${custToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { status: string; paidAt: string | null };
    expect(body.status).toBe("PAID");
    expect(body.paidAt).toBeTruthy();
  });

  it("a different customer cannot mark someone else's invoice as paid → 403", async () => {
    const OTHER_CUSTOMER = "00000000-9999-9999-9999-999999999999";
    const OTHER_COMPANY = "00000000-8888-8888-8888-888888888888";
    stubCrossServiceFetch({
      placements: [buildPlacement()],
      commissionRules: fullW2Rules(IDS.placement),
      customerPrimaryUsers: [
        { primaryUserId: IDS.customer, id: IDS.company },
        { primaryUserId: OTHER_CUSTOMER, id: OTHER_COMPANY },
      ],
    });
    await insertApprovedTimesheet({
      placementId: IDS.placement,
      candidateId: IDS.candidate,
      weekStartDate: BILLING_START,
      hours: 40,
      approverUserId: IDS.customer,
    });

    const { createInvoiceGeneratorService } = await import("../../src/services/invoice-generator.service.js");
    const { createPlacementApi } = await import("../../src/lib/placement-api.js");
    const { createServiceTokenSigner } = await import("../../src/lib/service-token.js");
    const signer = createServiceTokenSigner(process.env.JWT_PRIVATE_KEY!, "payments-test");
    const placementApi = createPlacementApi(process.env.PLACEMENT_SVC_URL!, signer);
    const gen = createInvoiceGeneratorService({
      placementApi,
      logger: { info: () => undefined, warn: () => undefined },
    });
    await gen.generateWeeklyInvoices(BILLING_START, BILLING_END);

    const inv = await getPrisma().invoice.findFirstOrThrow({
      where: { customerCompanyId: IDS.company, invoiceType: "WEEKLY_HOURS" },
    });

    const server = await getServer();
    const otherToken = await makeBearerToken(OTHER_CUSTOMER, ["CUSTOMER"]);

    const res = await server.inject({
      method: "POST",
      url: `/api/v1/invoices/${inv.id}/mark-paid`,
      headers: { authorization: `Bearer ${otherToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it("candidate can list only their own timesheets", async () => {
    stubCrossServiceFetch({
      placements: [buildPlacement()],
      commissionRules: fullW2Rules(IDS.placement),
    });
    // Candidate A submits
    await insertApprovedTimesheet({
      placementId: IDS.placement,
      candidateId: IDS.candidate,
      weekStartDate: BILLING_START,
      hours: 40,
      approverUserId: IDS.customer,
    });
    // Another candidate has a timesheet on a different placement
    await insertApprovedTimesheet({
      placementId: "eeeeeeee-ffff-ffff-ffff-ffffffffffff",
      candidateId: "00000000-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      weekStartDate: BILLING_START,
      hours: 30,
      approverUserId: IDS.customer,
    });

    const server = await getServer();
    const candToken = await makeBearerToken(IDS.candidate, ["CANDIDATE"]);
    const res = await server.inject({
      method: "GET",
      url: "/api/v1/timesheets",
      headers: { authorization: `Bearer ${candToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: Array<{ candidateId: string }> };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]!.candidateId).toBe(IDS.candidate);
  });
});
