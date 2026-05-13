import type { NotificationType } from "@techorbit/types";
import { prisma } from "../lib/prisma.js";
import type { NotificationPreference } from "../generated/client/index.js";

export type PreferenceShape = {
  emailEnabled: boolean;
  smsEnabled: boolean;
  perType: Partial<Record<NotificationType, boolean>>;
};

function parsePerType(raw: unknown): Partial<Record<NotificationType, boolean>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Partial<Record<NotificationType, boolean>> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "boolean") out[k as NotificationType] = v;
  }
  return out;
}

export function toShape(row: NotificationPreference): PreferenceShape {
  return {
    emailEnabled: row.emailEnabled,
    smsEnabled: row.smsEnabled,
    perType: parsePerType(row.preferences),
  };
}

export async function getOrCreatePreference(
  userId: string,
): Promise<NotificationPreference> {
  const existing = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.notificationPreference.create({
    data: { userId, emailEnabled: true, smsEnabled: false, preferences: {} },
  });
}

export async function updatePreference(
  userId: string,
  patch: Partial<PreferenceShape>,
): Promise<NotificationPreference> {
  const current = await getOrCreatePreference(userId);
  const nextPerType = {
    ...parsePerType(current.preferences),
    ...(patch.perType ?? {}),
  };
  return prisma.notificationPreference.update({
    where: { userId },
    data: {
      emailEnabled: patch.emailEnabled ?? current.emailEnabled,
      smsEnabled: patch.smsEnabled ?? current.smsEnabled,
      preferences: nextPerType,
    },
  });
}

// Whether a given notification type should be delivered on a given channel.
// Default = true when the user hasn't set a per-type override.
export function shouldDeliver(
  pref: PreferenceShape,
  type: NotificationType,
  channel: "email" | "sms" | "inApp",
): boolean {
  if (channel === "email" && !pref.emailEnabled) return false;
  if (channel === "sms" && !pref.smsEnabled) return false;
  const perType = pref.perType[type];
  if (perType === false) return false;
  return true;
}
