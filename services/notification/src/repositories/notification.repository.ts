import type { NotificationType } from "@techorbit/types";
import { prisma } from "../lib/prisma.js";
import type { Notification, Prisma } from "../generated/client/index.js";

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string | null;
};

export async function createNotification(
  input: CreateNotificationInput,
): Promise<Notification> {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      linkUrl: input.linkUrl ?? null,
    },
  });
}

export async function listNotifications(params: {
  userId: string;
  unreadOnly: boolean;
  type?: NotificationType;
  cursor?: string;
  limit: number;
}): Promise<{ rows: Notification[]; unreadCount: number }> {
  const where: Prisma.NotificationWhereInput = { userId: params.userId };
  if (params.unreadOnly) where.readAt = null;
  if (params.type) where.type = params.type;

  const rows = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: params.limit + 1,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
  });
  const unreadCount = await prisma.notification.count({
    where: { userId: params.userId, readAt: null },
  });
  return { rows, unreadCount };
}

export async function markRead(userId: string, id: string): Promise<Notification | null> {
  const row = await prisma.notification.findUnique({ where: { id } });
  if (!row || row.userId !== userId) return null;
  if (row.readAt) return row;
  return prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}

export async function isEventProcessed(eventId: string): Promise<boolean> {
  const row = await prisma.processedEvent.findUnique({ where: { eventId } });
  return row !== null;
}

export async function markEventProcessed(
  eventId: string,
  eventType: string,
): Promise<void> {
  await prisma.processedEvent.create({
    data: { eventId, eventType },
  });
}
