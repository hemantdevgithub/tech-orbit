import { NotFoundError, ValidationError } from "@techorbit/errors";
import type { AuthContext } from "@techorbit/auth-middleware";
import type {
  NotificationFilter,
  NotificationListResponse,
  NotificationResponse,
  NotificationType,
  UpdateNotificationPreference,
  NotificationPreferenceResponse,
} from "@techorbit/types";
import type { FastifyBaseLogger } from "fastify";
import type { EmailClient } from "../lib/sendgrid-mock.js";
import type { SmsClient } from "../lib/twilio-mock.js";
import {
  createNotification,
  isEventProcessed,
  listNotifications,
  markAllRead,
  markEventProcessed,
  markRead,
} from "../repositories/notification.repository.js";
import {
  getOrCreatePreference,
  shouldDeliver,
  toShape,
  updatePreference,
} from "../repositories/preference.repository.js";
import type { Notification } from "../generated/client/index.js";

export type NotificationServiceDeps = {
  email: EmailClient;
  sms: SmsClient;
  logger: FastifyBaseLogger;
  // Optional profile lookup — used to resolve email/phone for a userId.
  lookupContact?: (userId: string) => Promise<{ email?: string; phone?: string }>;
};

export type NotificationService = ReturnType<typeof createNotificationService>;

function toResponse(n: Notification): NotificationResponse {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    message: n.message,
    linkUrl: n.linkUrl,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  };
}

export function createNotificationService(deps: NotificationServiceDeps) {
  async function deliver(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    linkUrl?: string | null,
  ): Promise<NotificationResponse> {
    const row = await createNotification({ userId, type, title, message, linkUrl });

    // Best-effort email/SMS fan-out. Never fail the notification creation on
    // downstream errors — logs stay structured so ops can trace drops.
    try {
      const prefRow = await getOrCreatePreference(userId);
      const pref = toShape(prefRow);
      const contact = deps.lookupContact ? await deps.lookupContact(userId) : {};

      if (shouldDeliver(pref, type, "email") && contact.email) {
        await deps.email.sendEmail({
          to: contact.email,
          subject: title,
          body: linkUrl ? `${message}\n\nOpen: ${linkUrl}` : message,
        });
      }
      if (shouldDeliver(pref, type, "sms") && contact.phone) {
        await deps.sms.sendSms({
          to: contact.phone,
          message: `${title} — ${message.slice(0, 120)}`,
        });
      }
    } catch (err) {
      deps.logger.warn({ err, userId, type }, "notification fan-out failed");
    }

    return toResponse(row);
  }

  async function recordProcessed(eventId: string, eventType: string): Promise<boolean> {
    if (await isEventProcessed(eventId)) return false;
    await markEventProcessed(eventId, eventType);
    return true;
  }

  return {
    deliver,
    recordProcessed,

    async listForUser(
      auth: AuthContext,
      filter: NotificationFilter,
    ): Promise<NotificationListResponse> {
      const { rows, unreadCount } = await listNotifications({
        userId: auth.userId,
        unreadOnly: filter.unreadOnly,
        type: filter.type,
        cursor: filter.cursor,
        limit: filter.limit,
      });
      const hasMore = rows.length > filter.limit;
      const sliced = hasMore ? rows.slice(0, filter.limit) : rows;
      return {
        data: sliced.map(toResponse),
        nextCursor: hasMore ? (sliced[sliced.length - 1]?.id ?? null) : null,
        hasMore,
        unreadCount,
      };
    },

    async markRead(auth: AuthContext, id: string): Promise<NotificationResponse> {
      const row = await markRead(auth.userId, id);
      if (!row) throw new NotFoundError("Notification not found");
      return toResponse(row);
    },

    async markAllRead(auth: AuthContext): Promise<{ updatedCount: number }> {
      const count = await markAllRead(auth.userId);
      return { updatedCount: count };
    },

    async getPreference(auth: AuthContext): Promise<NotificationPreferenceResponse> {
      const row = await getOrCreatePreference(auth.userId);
      const shape = toShape(row);
      return {
        userId: row.userId,
        emailEnabled: shape.emailEnabled,
        smsEnabled: shape.smsEnabled,
        perType: shape.perType as Record<NotificationType, boolean>,
        updatedAt: row.updatedAt.toISOString(),
      };
    },

    async updatePreference(
      auth: AuthContext,
      patch: UpdateNotificationPreference,
    ): Promise<NotificationPreferenceResponse> {
      if (Object.keys(patch).length === 0) {
        throw new ValidationError("At least one preference field is required");
      }
      const row = await updatePreference(auth.userId, patch);
      const shape = toShape(row);
      return {
        userId: row.userId,
        emailEnabled: shape.emailEnabled,
        smsEnabled: shape.smsEnabled,
        perType: shape.perType as Record<NotificationType, boolean>,
        updatedAt: row.updatedAt.toISOString(),
      };
    },
  };
}
