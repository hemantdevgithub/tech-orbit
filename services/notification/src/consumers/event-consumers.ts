import type { EventBus, EventEnvelope } from "@techorbit/event-bus";
import type { NotificationService } from "../services/notification.service.js";
import type { FastifyBaseLogger } from "fastify";
import type { IdentityApi } from "../lib/identity-api.js";
import { forEachUserWithRole } from "../lib/identity-api.js";

type Deps = {
  notificationService: NotificationService;
  identityApi: IdentityApi | null;
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
  const { notificationService, identityApi, logger } = deps;

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
    // Sprint 12 — fan out to EVERY active CRM. Honors per-user preferences
    // via the existing deliver() pipeline.
    "requirement.published.v1": {
      queue: "notification.requirement-published",
      handler: async (envelope) =>
        process(envelope, async (payload) => {
          const requirementId = str(payload.requirementId);
          const title = str(payload.title) ?? "New requirement available";
          if (!requirementId) return;
          if (!identityApi) {
            logger.warn(
              { requirementId },
              "requirement.published.v1: identity-svc client not configured; skipping fan-out",
            );
            return;
          }
          await forEachUserWithRole(identityApi, "CRM", async (user) => {
            await notificationService.deliver(
              user.id,
              "REQUIREMENT_PUBLISHED",
              "New requirement available",
              `A customer just posted: ${title}. Accept it on the Opportunity Portal.`,
              "/techforce/opportunity-portal",
            );
          });
        }),
    },

    // Sprint 12 — a CRM was assigned an SRM to this requirement.
    "requirement.srm-assigned.v1": {
      queue: "notification.requirement-srm-assigned",
      handler: async (envelope) =>
        process(envelope, async (payload) => {
          const srmUserId = str(payload.srmUserId);
          const requirementId = str(payload.requirementId);
          const requirementTitle =
            str(payload.requirementTitle) ?? "a new requirement";
          if (!srmUserId || !requirementId) return;
          await notificationService.deliver(
            srmUserId,
            "REQUIREMENT_ASSIGNED",
            "You've been assigned a requirement",
            `A CRM assigned you to source for: ${requirementTitle}.`,
            "/techforce/opportunity-portal",
          );
        }),
    },

    // Sprint 12 — SRM invited a candidate/MSME to their portfolio.
    "srm-portfolio.invited.v1": {
      queue: "notification.srm-portfolio-invited",
      handler: async (envelope) =>
        process(envelope, async (payload) => {
          const memberUserId = str(payload.memberUserId);
          if (!memberUserId) return;
          await notificationService.deliver(
            memberUserId,
            "PORTFOLIO_INVITATION",
            "An SRM invited you to their portfolio",
            "A recruiter wants you in their roster of go-to talent.",
            "/techforce/roster/requests",
          );
        }),
    },

    // Sprint 12 — candidate/MSME asked to join an SRM's portfolio.
    "srm-portfolio.requested.v1": {
      queue: "notification.srm-portfolio-requested",
      handler: async (envelope) =>
        process(envelope, async (payload) => {
          const srmUserId = str(payload.srmUserId);
          if (!srmUserId) return;
          await notificationService.deliver(
            srmUserId,
            "PORTFOLIO_REQUEST",
            "Someone wants to join your portfolio",
            "Open your requests inbox to review and approve.",
            "/techforce/roster/requests",
          );
        }),
    },

    // Sprint 12 — the counterparty approved the portfolio membership.
    "srm-portfolio.approved.v1": {
      queue: "notification.srm-portfolio-approved",
      handler: async (envelope) =>
        process(envelope, async (payload) => {
          const initiatedByUserId = str(payload.initiatedByUserId);
          if (!initiatedByUserId) return;
          await notificationService.deliver(
            initiatedByUserId,
            "PORTFOLIO_APPROVED",
            "Portfolio membership approved",
            "Your roster connection is now active. You can invite or be invited to jobs.",
            "/techforce/roster",
          );
        }),
    },

    // Sprint 12 — SRM invited a candidate to apply for a requirement.
    "submission.invited.v1": {
      queue: "notification.submission-invited",
      handler: async (envelope) =>
        process(envelope, async (payload) => {
          const candidateId = str(payload.candidateId);
          const submissionId = str(payload.submissionId);
          if (!candidateId || !submissionId) return;
          await notificationService.deliver(
            candidateId,
            "SUBMISSION_INVITED",
            "An SRM invited you to apply",
            "Open your invitations to accept or decline.",
            "/techforce/invitations",
          );
        }),
    },

    // Sprint 12 — invited candidate accepted.
    "submission.invite-accepted.v1": {
      queue: "notification.submission-invite-accepted",
      handler: async (envelope) =>
        process(envelope, async (payload) => {
          const srmUserId = str(payload.invitedBySrmId);
          const submissionId = str(payload.submissionId);
          if (!srmUserId || !submissionId) return;
          await notificationService.deliver(
            srmUserId,
            "SUBMISSION_INVITE_ACCEPTED",
            "Your invitation was accepted",
            "The candidate accepted — the submission is now in screening.",
            `/techforce/submissions/${submissionId}`,
          );
        }),
    },

    // Sprint 12 — invited candidate declined.
    "submission.invite-declined.v1": {
      queue: "notification.submission-invite-declined",
      handler: async (envelope) =>
        process(envelope, async (payload) => {
          const srmUserId = str(payload.invitedBySrmId);
          if (!srmUserId) return;
          await notificationService.deliver(
            srmUserId,
            "SUBMISSION_INVITE_DECLINED",
            "Your invitation was declined",
            str(payload.reason) ?? "The candidate declined to apply.",
            "/techforce/opportunity-portal",
          );
        }),
    },

    // Sprint 12 — SRM assigned a requirement to an MSME.
    "requirement.assigned-msme.v1": {
      queue: "notification.requirement-assigned-msme",
      handler: async (envelope) =>
        process(envelope, async (payload) => {
          const msmeUserId = str(payload.msmePrimaryUserId);
          const requirementTitle =
            str(payload.requirementTitle) ?? "a requirement";
          if (!msmeUserId) return;
          await notificationService.deliver(
            msmeUserId,
            "MSME_ASSIGNMENT",
            "An SRM assigned you a requirement",
            `Submit a bench consultant for: ${requirementTitle}.`,
            "/techforce/opportunity-portal",
          );
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
