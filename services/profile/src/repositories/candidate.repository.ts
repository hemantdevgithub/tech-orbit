import type { CandidateProfile } from "@prisma/client";
import type { BackgroundCheckStatus, BenchAvailability } from "@prisma/client";
import { ForbiddenError, NotFoundError } from "@techorbit/errors";
import type { AuthContext } from "@techorbit/auth-middleware";
import { prisma } from "../lib/prisma.js";

// Explicitly typed to avoid Prisma update-operation wrappers in create calls
export type CandidateProfileData = {
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  seniority?: "JUNIOR" | "MID" | "SENIOR" | "STAFF" | "PRINCIPAL" | "PARTNER" | null;
  skills?: string[];
  workAuthStatus?: string | null;
  workAuthExpiry?: Date | null;
  availableFrom?: Date | null;
  rateMin?: number | null;
  rateMax?: number | null;
  preferRemote?: boolean;
  preferHybrid?: boolean;
  preferOnsite?: boolean;
  locationPreference?: string | null;
  resumeFileId?: string | null;
  backgroundCheckStatus?: BackgroundCheckStatus;
  backgroundCheckId?: string | null;
  kycVerified?: boolean;
  kycSessionId?: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _NoBenchAvailability = BenchAvailability; // keep import used for future

export const candidateRepository = {
  async findByUserId(userId: string): Promise<CandidateProfile | null> {
    return prisma.candidateProfile.findUnique({ where: { userId } });
  },

  async getByUserId(ctx: AuthContext, userId: string): Promise<CandidateProfile> {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundError("Candidate profile not found");

    const canRead =
      ctx.userId === userId ||
      ctx.roles.some((r) => ["ADMIN", "CRM", "SRM"].includes(r));
    if (!canRead) throw new ForbiddenError("Cannot access this profile");

    return profile;
  },

  async upsert(
    ctx: AuthContext,
    userId: string,
    data: CandidateProfileData,
  ): Promise<CandidateProfile> {
    if (ctx.userId !== userId) {
      throw new ForbiddenError("Cannot update another user's profile");
    }
    return prisma.candidateProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  },

  async createShell(userId: string): Promise<CandidateProfile> {
    return prisma.candidateProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  },

  async updateResumeFileId(
    ctx: AuthContext,
    userId: string,
    resumeFileId: string,
  ): Promise<CandidateProfile> {
    if (ctx.userId !== userId) {
      throw new ForbiddenError("Cannot update another user's profile");
    }
    const profile = await prisma.candidateProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundError("Candidate profile not found");
    return prisma.candidateProfile.update({
      where: { userId },
      data: { resumeFileId },
    });
  },

  async markComplete(userId: string): Promise<CandidateProfile> {
    return prisma.candidateProfile.update({
      where: { userId },
      data: { isProfileComplete: true },
    });
  },
};
