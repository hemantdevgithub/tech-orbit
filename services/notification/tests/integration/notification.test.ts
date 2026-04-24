import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import {
  IDS,
  closeServer,
  getPrisma,
  getServer,
  makeBearerToken,
  resetDb,
  runIntegrationSuite,
} from "./helpers.js";
import { createHandlers } from "../../src/consumers/event-consumers.js";
import { createNotificationService } from "../../src/services/notification.service.js";
import type { EventEnvelope } from "@techorbit/event-bus";

function envelope(type: string, id: string, payload: Record<string, unknown>): EventEnvelope {
  return {
    id,
    type,
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    source: "test",
    correlationId: id,
    payload,
  };
}

const fakeLogger = {
  info: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {},
  trace: () => {},
  fatal: () => {},
  child: () => fakeLogger,
  level: "info",
  silent: () => {},
} as unknown as Parameters<typeof createNotificationService>[0]["logger"];

runIntegrationSuite("Notification consumers + API", () => {
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

  it("1. submission.created.v1 → notification created for customer", async () => {
    const email = { sendEmail: vi.fn().mockResolvedValue({ messageId: "m-1" }) };
    const sms = { sendSms: vi.fn() };
    const svc = createNotificationService({ email, sms, logger: fakeLogger });
    const handlers = createHandlers({ notificationService: svc, logger: fakeLogger });

    await handlers["submission.created.v1"]!.handler(
      envelope("submission.created.v1", "ev-sub-1", {
        customerUserId: IDS.alice,
        requirementTitle: "Senior React Engineer",
        submissionId: "00000000-0000-0000-0000-000000000001",
      }),
    );

    const rows = await getPrisma().notification.findMany({ where: { userId: IDS.alice } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.type).toBe("SUBMISSION_RECEIVED");
    expect(rows[0]!.message).toContain("Senior React Engineer");
    expect(email.sendEmail).not.toHaveBeenCalled(); // no contact lookup wired
  });

  it("2. invoice.generated.v1 → notification created with $ formatting", async () => {
    const email = { sendEmail: vi.fn() };
    const sms = { sendSms: vi.fn() };
    const svc = createNotificationService({ email, sms, logger: fakeLogger });
    const handlers = createHandlers({ notificationService: svc, logger: fakeLogger });

    await handlers["invoice.generated.v1"]!.handler(
      envelope("invoice.generated.v1", "ev-inv-1", {
        customerUserId: IDS.alice,
        invoiceId: "00000000-0000-0000-0000-000000000002",
        totalUsd: 4800,
      }),
    );

    const rows = await getPrisma().notification.findMany({ where: { userId: IDS.alice } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.message).toContain("$4,800");
    expect(rows[0]!.linkUrl).toBe("/invoices/00000000-0000-0000-0000-000000000002");
  });

  it("3. duplicate event (same eventId) → dedupes via ProcessedEvent", async () => {
    const email = { sendEmail: vi.fn() };
    const sms = { sendSms: vi.fn() };
    const svc = createNotificationService({ email, sms, logger: fakeLogger });
    const handlers = createHandlers({ notificationService: svc, logger: fakeLogger });

    const ev = envelope("submission.created.v1", "ev-dup-1", {
      customerUserId: IDS.alice,
      requirementTitle: "Same",
      submissionId: "00000000-0000-0000-0000-000000000001",
    });
    await handlers["submission.created.v1"]!.handler(ev);
    await handlers["submission.created.v1"]!.handler(ev);

    const rows = await getPrisma().notification.findMany({ where: { userId: IDS.alice } });
    expect(rows).toHaveLength(1);
    const processed = await getPrisma().processedEvent.count();
    expect(processed).toBe(1);
  });

  it("4. emailEnabled=true + contact lookup → SendGrid mock called", async () => {
    const email = { sendEmail: vi.fn().mockResolvedValue({ messageId: "m-2" }) };
    const sms = { sendSms: vi.fn() };
    const svc = createNotificationService({
      email,
      sms,
      logger: fakeLogger,
      lookupContact: async () => ({ email: "alice@example.test" }),
    });
    const handlers = createHandlers({ notificationService: svc, logger: fakeLogger });

    await handlers["timesheet.approved.v1"]!.handler(
      envelope("timesheet.approved.v1", "ev-ts-1", {
        candidateUserId: IDS.alice,
        timesheetId: "00000000-0000-0000-0000-000000000003",
      }),
    );

    expect(email.sendEmail).toHaveBeenCalledTimes(1);
    expect(email.sendEmail.mock.calls[0]![0]).toMatchObject({ to: "alice@example.test" });
  });

  it("5. smsEnabled=true + contact + preference → Twilio mock called", async () => {
    await getPrisma().notificationPreference.create({
      data: {
        userId: IDS.bob,
        emailEnabled: false,
        smsEnabled: true,
        preferences: {},
      },
    });

    const email = { sendEmail: vi.fn() };
    const sms = { sendSms: vi.fn().mockResolvedValue({ sid: "SM-1" }) };
    const svc = createNotificationService({
      email,
      sms,
      logger: fakeLogger,
      lookupContact: async () => ({ phone: "+15551234567" }),
    });
    const handlers = createHandlers({ notificationService: svc, logger: fakeLogger });

    await handlers["payout.processed.v1"]!.handler(
      envelope("payout.processed.v1", "ev-po-1", {
        beneficiaryUserId: IDS.bob,
        payoutId: "00000000-0000-0000-0000-000000000004",
        amountUsd: 240,
        status: "COMPLETED",
      }),
    );

    expect(email.sendEmail).not.toHaveBeenCalled();
    expect(sms.sendSms).toHaveBeenCalledTimes(1);
    expect(sms.sendSms.mock.calls[0]![0]).toMatchObject({ to: "+15551234567" });
  });

  it("6. GET /api/v1/notifications → scoped to caller", async () => {
    await getPrisma().notification.createMany({
      data: [
        { userId: IDS.alice, type: "MESSAGE_RECEIVED", title: "A", message: "For Alice" },
        { userId: IDS.bob, type: "MESSAGE_RECEIVED", title: "B", message: "For Bob" },
      ],
    });

    const app = await getServer();
    const token = await makeBearerToken(IDS.alice);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/notifications",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].message).toBe("For Alice");
    expect(body.unreadCount).toBe(1);
  });

  it("7. POST /:id/mark-read → readAt set", async () => {
    const created = await getPrisma().notification.create({
      data: { userId: IDS.alice, type: "MESSAGE_RECEIVED", title: "A", message: "Hi" },
    });

    const app = await getServer();
    const token = await makeBearerToken(IDS.alice);

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/notifications/${created.id}/mark-read`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().readAt).not.toBeNull();

    const row = await getPrisma().notification.findUnique({ where: { id: created.id } });
    expect(row!.readAt).not.toBeNull();
  });
});
