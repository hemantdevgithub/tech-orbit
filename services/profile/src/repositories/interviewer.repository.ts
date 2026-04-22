import type { InterviewerProfile } from "../generated/client/index.js";
import { ForbiddenError, NotFoundError } from "@techorbit/errors";
import type { AuthContext } from "@techorbit/auth-middleware";
import { prisma } from "../lib/prisma.js";

export type InterviewerProfileData = {
  displayName?: string | null;
  headline?: string | null;
  bio?: string | null;
  currentRole?: string | null;
  currentCompany?: string | null;
  specializations?: string[];
  seniorityLevelsCoverable?: ("JUNIOR" | "MID" | "SENIOR" | "STAFF" | "PRINCIPAL" | "PARTNER")[];
  interviewTypes?: (
    | "TECHNICAL_CODING"
    | "SYSTEM_DESIGN"
    | "BEHAVIORAL"
    | "CASE_STUDY"
    | "DOMAIN_SPECIFIC"
  )[];
  perInterviewFeeUsd?: number | null;
  timezone?: string | null;
  videoIntroFileId?: string | null;
  linkedinVerified?: boolean;
  calendarProvider?: "GOOGLE" | "OUTLOOK" | null;
  calendarRefreshToken?: string | null;
  stripeAccountId?: string | null;
  status?: "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED";
};

export type AvailabilitySlot = {
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
};

export const interviewerRepository = {
  async findByUserId(userId: string): Promise<InterviewerProfile | null> {
    return prisma.interviewerProfile.findUnique({ where: { userId } });
  },

  async getByUserId(ctx: AuthContext, userId: string): Promise<InterviewerProfile> {
    const profile = await prisma.interviewerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundError("Interviewer profile not found");

    const canRead =
      ctx.userId === userId ||
      ctx.roles.some((r) => ["ADMIN", "CRM", "SRM"].includes(r));
    if (!canRead) throw new ForbiddenError("Cannot access this profile");

    return profile;
  },

  async create(userId: string, data: InterviewerProfileData): Promise<InterviewerProfile> {
    return prisma.interviewerProfile.create({ data: { userId, ...data } });
  },

  async update(
    ctx: AuthContext,
    userId: string,
    data: InterviewerProfileData,
  ): Promise<InterviewerProfile> {
    const profile = await prisma.interviewerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundError("Interviewer profile not found");

    const canWrite = ctx.userId === userId || ctx.roles.includes("ADMIN");
    if (!canWrite) throw new ForbiddenError("Cannot update this profile");

    return prisma.interviewerProfile.update({ where: { userId }, data });
  },

  async createShell(userId: string): Promise<InterviewerProfile> {
    return prisma.interviewerProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  },

  async setAvailabilitySlots(
    ctx: AuthContext,
    userId: string,
    slots: AvailabilitySlot[],
  ): Promise<InterviewerProfile> {
    if (ctx.userId !== userId) {
      throw new ForbiddenError("Cannot update another interviewer's availability");
    }
    const profile = await prisma.interviewerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundError("Interviewer profile not found");

    return prisma.interviewerProfile.update({
      where: { userId },
      // Cast needed: Prisma Json expects `InputJsonValue` but our typed array is valid JSON
      data: { availabilitySlots: slots as unknown as Parameters<typeof prisma.interviewerProfile.update>[0]["data"]["availabilitySlots"] },
    });
  },

  async markComplete(userId: string): Promise<InterviewerProfile> {
    return prisma.interviewerProfile.update({
      where: { userId },
      data: { isProfileComplete: true },
    });
  },
};
