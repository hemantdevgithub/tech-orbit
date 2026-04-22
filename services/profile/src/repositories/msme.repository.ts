import type { MsmeProfile, MsmeBenchEntry } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { ForbiddenError, NotFoundError, ConflictError } from "@techorbit/errors";
import type { AuthContext } from "@techorbit/auth-middleware";
import { prisma } from "../lib/prisma.js";

export type MsmeProfileData = {
  legalName?: string;
  dba?: string | null;
  einEncrypted?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  gstin?: string | null;
  countryOfIncorp?: string | null;
  website?: string | null;
  yearsInBusiness?: number | null;
  totalEmployees?: number | null;
  w9FileId?: string | null;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  primaryContactPhone?: string | null;
  status?: "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED";
};

export type BenchEntryInput = {
  candidateUserId: string;
  availability?: "AVAILABLE" | "ENGAGED" | "NOTICE_PERIOD" | "UNAVAILABLE";
  expectedRateMin?: number;
  expectedRateMax?: number;
  skills?: string[];
  notes?: string;
};

export const msmeRepository = {
  async findByOwnerUserId(ownerUserId: string): Promise<MsmeProfile | null> {
    return prisma.msmeProfile.findUnique({ where: { ownerUserId } });
  },

  async getByOwnerUserId(ctx: AuthContext, ownerUserId: string): Promise<MsmeProfile> {
    const profile = await prisma.msmeProfile.findUnique({ where: { ownerUserId } });
    if (!profile) throw new NotFoundError("MSME profile not found");

    const canRead =
      ctx.userId === ownerUserId ||
      ctx.roles.some((r) => ["ADMIN", "CRM"].includes(r));
    if (!canRead) throw new ForbiddenError("Cannot access this profile");

    return profile;
  },

  async create(ownerUserId: string, data: MsmeProfileData): Promise<MsmeProfile> {
    return prisma.msmeProfile.create({
      data: { ownerUserId, legalName: data.legalName ?? "", ...data },
    });
  },

  async update(
    ctx: AuthContext,
    ownerUserId: string,
    data: MsmeProfileData,
  ): Promise<MsmeProfile> {
    const profile = await prisma.msmeProfile.findUnique({ where: { ownerUserId } });
    if (!profile) throw new NotFoundError("MSME profile not found");

    const canWrite = ctx.userId === ownerUserId || ctx.roles.includes("ADMIN");
    if (!canWrite) throw new ForbiddenError("Cannot update this profile");

    return prisma.msmeProfile.update({ where: { ownerUserId }, data });
  },

  async createShell(ownerUserId: string, legalName: string): Promise<MsmeProfile> {
    return prisma.msmeProfile.upsert({
      where: { ownerUserId },
      create: { ownerUserId, legalName },
      update: {},
    });
  },

  async markComplete(ownerUserId: string): Promise<MsmeProfile> {
    return prisma.msmeProfile.update({
      where: { ownerUserId },
      data: { isProfileComplete: true },
    });
  },

  // ─── Bench entries ───────────────────────────────────────────────────────────

  async getBenchEntries(ctx: AuthContext, ownerUserId: string): Promise<MsmeBenchEntry[]> {
    const profile = await prisma.msmeProfile.findUnique({ where: { ownerUserId } });
    if (!profile) throw new NotFoundError("MSME profile not found");

    const canRead =
      ctx.userId === ownerUserId ||
      ctx.roles.some((r) => ["ADMIN", "CRM", "SRM"].includes(r));
    if (!canRead) throw new ForbiddenError("Cannot access bench entries");

    return prisma.msmeBenchEntry.findMany({ where: { msmeId: profile.id } });
  },

  async addBenchEntry(
    ctx: AuthContext,
    ownerUserId: string,
    input: BenchEntryInput,
  ): Promise<MsmeBenchEntry> {
    const profile = await prisma.msmeProfile.findUnique({ where: { ownerUserId } });
    if (!profile) throw new NotFoundError("MSME profile not found");

    if (ctx.userId !== ownerUserId && !ctx.roles.includes("ADMIN")) {
      throw new ForbiddenError("Cannot add bench entries to this MSME");
    }

    const existing = await prisma.msmeBenchEntry.findUnique({
      where: {
        msmeId_candidateUserId: { msmeId: profile.id, candidateUserId: input.candidateUserId },
      },
    });
    if (existing) throw new ConflictError("Candidate already on bench");

    const entry = await prisma.msmeBenchEntry.create({
      data: {
        msmeId: profile.id,
        candidateUserId: input.candidateUserId,
        availability: input.availability ?? "AVAILABLE",
        expectedRateMin: input.expectedRateMin,
        expectedRateMax: input.expectedRateMax,
        skills: input.skills ?? [],
        notes: input.notes,
      },
    });

    await prisma.msmeProfile.update({
      where: { id: profile.id },
      data: { currentBenchSize: { increment: 1 } },
    });

    return entry;
  },

  async removeBenchEntry(
    ctx: AuthContext,
    ownerUserId: string,
    entryId: string,
  ): Promise<void> {
    const profile = await prisma.msmeProfile.findUnique({ where: { ownerUserId } });
    if (!profile) throw new NotFoundError("MSME profile not found");

    if (ctx.userId !== ownerUserId && !ctx.roles.includes("ADMIN")) {
      throw new ForbiddenError("Cannot remove bench entries from this MSME");
    }

    const entry = await prisma.msmeBenchEntry.findUnique({ where: { id: entryId } });
    if (!entry || entry.msmeId !== profile.id) throw new NotFoundError("Bench entry not found");

    await prisma.msmeBenchEntry.delete({ where: { id: entryId } });
    await prisma.msmeProfile.update({
      where: { id: profile.id },
      data: { currentBenchSize: { decrement: 1 } },
    });
  },
};
