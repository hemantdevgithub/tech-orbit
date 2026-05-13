import type { EventBus, EventEnvelope } from "@techorbit/event-bus";
import type { NotificationService } from "../services/notification.service.js";
import type { FastifyBaseLogger } from "fastify";

type Deps = {
  notificationService: NotificationService;
  logger: FastifyBaseLogger;
};

export type Handler = (envelope: EventEnvelope) => Promise<void>;
export type HandlerMap = Record<string, { handler: Handler; queue: string }>;

// Each consumer:
//   1. Dedupes via ProcessedEvent (recordProcessed returns false on duplicate)
//   2. Shapes the event into title + message + linkUrl
//   3. Delegates to notificationService.deliver() which writes Notification
//      and best-effort-sends email/SMS per user preferences.

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}
function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}
function num(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}

export function createHandlers(deps: Deps): HandlerMap {
  const { notificationService, logger } = deps;

  async function process(
    envelope: EventEnvelope,
    fn: (payload: Record<string, unknown>) => Promise<void> | void,
  ): Promise<void> {
    const fresh = await notificationService.recordProcessed(envelope.id, envelope.type);
    if (!fresh) {
      logger.info({ id: envelope.id, type: envelope.type }, "event already processed; skipping");
      return;
    }
    try {
      await fn(envelope.payload);
    } catch (err) {
      logger.error({ err, type: envelope.type, id: envelope.id }, "consumer handler failed");
    }
  }

  return {
    "requirement.published.v1": {
      queue: "notification.requirement-published",
      handler: async (envelope) =>
        process(envelope, async (payload) => {
          const title = str(payload.title) ?? "Untitled requirement";
          const requirementId = str(payload.requirementId);
          if (!requirementId) return;
          logger.info({ requirementId, title }, "requirement.published.v1 received (no fan-out target yet)");
        }),
    },

    "submission.created.v1": {
      queue: "notification.submission-created",
      handler: async (envelope) =>
        process(envelope, async (payload) => {
          const customerUserId = str(payload.customerUserId);
          const requirementTitle = str(payload.requirementTitle) ?? "your requirement";
          const submissionId = str(payload.submissionId);
          if (!customerUserId || !submissionId) return;
          await notificationService.deliver(
            customerUserId,
            "SUBMISSION_RECEIVED",
            "New submission received",
            `A candidate was submitted for ${requirementTitle}.`,
            `/submissions/${submissionId}`,
          );
        }),
    },

    "interview.scheduled.v1": {
      queue: "notification.interview-scheduled",
      handler: async (envelope) =>
        process(envelope, async (payload) => {
          const candidateUserId = str(payload.candidateUserId);
          const interviewerUserId = str(payload.interviewerUserId);
          const scheduledAt = str(payload.scheduledAt);
          const interviewId = str(payload.interviewId);
          if (!interviewId) return;
          const when = scheduledAt ? new Date(scheduledAt).toLocaleString() : "TBD";
          const link = `/interviews/${interviewId}`;
          if (candidateUserId) {
            await notificationService.deliver(
              candidateUserId,
              "INTERVIEW_SCHEDULED",
              "Interview scheduled",
              `Your interview is scheduled for ${when}.`,
              link,
            );
          }
          if (interviewerUserId) {
            await notificationService.deliver(
              interviewerUserId,
              "INTERVIEW_SCHEDULED",
              "You have a new interview to conduct",
              `Scheduled for ${when}.`,
              link,
            );
          }
        }),
    },

    "timesheet.submitted.v1": {
      queue: "notification.timesheet-submitted",
      handler: async (envelope) =>
        process(envelope, async (payload) => {
          const customerUserId = str(payload.customerUserId);
          const hoursWorked = num(payload.hoursWorked);
          const timesheetId = str(payload.timesheetId);
          if (!customerUserId || !timesheetId) return;
          await notificationService.deliver(
            customerUserId,
            "TIMESHEET_SUBMITTED",
            "Timesheet awaiting approval",
            `A candidate submitted ${hoursWorked ?? "?"} hours for approval.`,
            `/timesheets?status=SUBMITTED`,
          );
        }),
    },

    "timesheet.approved.v1": {
      queue: "notification.timesheet-approved",
      handler: async (envelope) =>
        process(envelope, async (payload) => {
          const candidateUserId = str(payload.candidateUserId);
          const timesheetId = str(payload.timesheetId);
          if (!candidateUserId || !timesheetId) return;
          await notificationService.deliver(
            candidateUserId,
            "TIMESHEET_APPROVED",
            "Timesheet approved",
            "Your weekly timesheet was approved. Earnings post on the next invoice.",
            "/timesheets",
          );
        }),
    },

    "invoice.generated.v1": {
      queue: "notification.invoice-generated",
      handler: async (envelope) =>
        process(envelope, async (payload) => {
          const obj = asObj(payload);
          const customerUserId = str(obj.customerUserId);
          const invoiceId = str(obj.invoiceId);
          const totalUsd = num(obj.totalUsd);
          if (!customerUserId || !invoiceId) return;
          const formatted = totalUsd !== undefined
            ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalUsd)
            : "a new amount";
          await notificationService.deliver(
            customerUserId,
            "INVOICE_GENERATED",
            "New invoice available",
            `Your weekly invoice for ${formatted} is ready.`,
            `/invoices/${invoiceId}`,
          );
        }),
    },

    "payout.processed.v1": {
      queue: "notification.payout-processed",
      handler: async (envelope) =>
        process(envelope, async (payload) => {
          const beneficiaryUserId = str(payload.beneficiaryUserId);
          const amountUsd = num(payload.amountUsd);
          const payoutId = str(payload.payoutId);
          const status = str(payload.status);
          if (!beneficiaryUserId || !payoutId || status !== "COMPLETED") return;
          const formatted = amountUsd !== undefined
            ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amountUsd)
            : "your commission";
          await notificationService.deliver(
            beneficiaryUserId,
            "PAYOUT_COMPLETED",
            "Commission payout completed",
            `${formatted} has been sent.`,
            "/payouts",
          );
        }),
    },

    "message.sent.v1": {
      queue: "notification.message-sent",
      handler: async (envelope) =>
        process(envelope, async (payload) => {
          const recipients = Array.isArray(payload.recipientUserIds)
            ? (payload.recipientUserIds as unknown[]).filter((r): r is string => typeof r === "string")
            : [];
          const threadId = str(payload.threadId);
          const preview = str(payload.preview) ?? "New message";
          if (!threadId || recipients.length === 0) return;
          await Promise.all(
            recipients.map((userId) =>
              notificationService.deliver(
                userId,
                "MESSAGE_RECEIVED",
                "You have a new message",
                preview.slice(0, 200),
                `/messages?thread=${threadId}`,
              ),
            ),
          );
        }),
    },

    "rating.submitted.v1": {
      queue: "notification.rating-submitted",
      handler: async (envelope) =>
        process(envelope, async (payload) => {
          const ratedUserId = str(payload.ratedUserId);
          const overallScore = num(payload.overallScore);
          const placementId = str(payload.placementId);
          if (!ratedUserId || !placementId) return;
          await notificationService.deliver(
            ratedUserId,
            "RATING_RECEIVED",
            "You received a new rating",
            overallScore !== undefined ? `Rated ${overallScore}/5 stars.` : "A new rating is visible on your profile.",
            `/placements/${placementId}`,
          );
        }),
    },
  };
}

export async function registerNotificationConsumers(
  eventBus: EventBus,
  deps: Deps,
): Promise<void> {
  const handlers = createHandlers(deps);
  for (const [type, { handler, queue }] of Object.entries(handlers)) {
    await eventBus.subscribe(type, handler, { queue });
  }
}
