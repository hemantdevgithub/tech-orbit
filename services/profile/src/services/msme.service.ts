import type { MsmeProfile, MsmeBenchEntry } from "../generated/client/index.js";
import { Prisma } from "../generated/client/index.js";
import type { AuthContext } from "@techorbit/auth-middleware";
import type {
  MsmeProfileResponse,
  CreateMsmeProfile,
  UpdateMsmeProfile,
  BenchEntryResponse,
  AddBenchEntry,
} from "@techorbit/types";
import { NotFoundError } from "@techorbit/errors";
import { msmeRepository } from "../repositories/msme.repository.js";
import type { EncryptionService } from "@techorbit/db-client";

function toResponse(p: MsmeProfile): MsmeProfileResponse {
  return {
    id: p.id,
    ownerUserId: p.ownerUserId,
    legalName: p.legalName,
    dba: p.dba,
    hasEin: p.einEncrypted !== null,
    gstin: p.gstin,
    countryOfIncorp: p.countryOfIncorp,
    website: p.website,
    yearsInBusiness: p.yearsInBusiness,
    totalEmployees: p.totalEmployees,
    currentBenchSize: p.currentBenchSize,
    w9FileId: p.w9FileId,
    primaryContactName: p.primaryContactName,
    primaryContactEmail: p.primaryContactEmail,
    primaryContactPhone: p.primaryContactPhone,
    status: p.status,
    isProfileComplete: p.isProfileComplete,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function toBenchResponse(e: MsmeBenchEntry): BenchEntryResponse {
  return {
    id: e.id,
    msmeId: e.msmeId,
    candidateUserId: e.candidateUserId,
    availability: e.availability,
    expectedRateMin: e.expectedRateMin,
    expectedRateMax: e.expectedRateMax,
    skills: e.skills,
    notes: e.notes,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

function isProfileComplete(p: MsmeProfile): boolean {
  return !!(
    p.legalName &&
    p.primaryContactEmail &&
    p.primaryContactName
  );
}

export function createMsmeService(encryptionService: EncryptionService) {
  return {
    async getProfile(ctx: AuthContext, ownerUserId: string): Promise<MsmeProfileResponse> {
      const profile = await msmeRepository.getByOwnerUserId(ctx, ownerUserId);
      return toResponse(profile);
    },

    async createProfile(
      ctx: AuthContext,
      ownerUserId: string,
      body: CreateMsmeProfile,
    ): Promise<MsmeProfileResponse> {
      const { ein, ...rest } = body;

      let einEncrypted: Prisma.InputJsonValue | typeof Prisma.JsonNull = Prisma.JsonNull;
      if (ein) {
        const encrypted = await encryptionService.encrypt(ein, {
          purpose: "ein",
          userId: ownerUserId,
        });
        einEncrypted = encrypted as unknown as Prisma.InputJsonValue;
      }

      const profile = await msmeRepository.create(ownerUserId, { ...rest, einEncrypted });

      if (isProfileComplete(profile) && !profile.isProfileComplete) {
        await msmeRepository.markComplete(ownerUserId);
        return toResponse({ ...profile, isProfileComplete: true });
      }
      return toResponse(profile);
    },

    async updateProfile(
      ctx: AuthContext,
      ownerUserId: string,
      body: UpdateMsmeProfile,
    ): Promise<MsmeProfileResponse> {
      const { ein, ...rest } = body;

      let einEncrypted: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined;
      if (ein !== undefined) {
        if (ein === null || ein === "") {
          einEncrypted = Prisma.JsonNull;
        } else {
          const encrypted = await encryptionService.encrypt(ein, {
            purpose: "ein",
            userId: ownerUserId,
          });
          einEncrypted = encrypted as unknown as Prisma.InputJsonValue;
        }
      }

      const data = einEncrypted !== undefined ? { ...rest, einEncrypted } : rest;
      const updated = await msmeRepository.update(ctx, ownerUserId, data);

      if (isProfileComplete(updated) && !updated.isProfileComplete) {
        await msmeRepository.markComplete(ownerUserId);
        return toResponse({ ...updated, isProfileComplete: true });
      }
      return toResponse(updated);
    },

    async getBenchEntries(
      ctx: AuthContext,
      ownerUserId: string,
    ): Promise<BenchEntryResponse[]> {
      const entries = await msmeRepository.getBenchEntries(ctx, ownerUserId);
      return entries.map(toBenchResponse);
    },

    async addBenchEntry(
      ctx: AuthContext,
      ownerUserId: string,
      body: AddBenchEntry,
    ): Promise<BenchEntryResponse> {
      const entry = await msmeRepository.addBenchEntry(ctx, ownerUserId, body);
      return toBenchResponse(entry);
    },

    async removeBenchEntry(
      ctx: AuthContext,
      ownerUserId: string,
      entryId: string,
    ): Promise<void> {
      await msmeRepository.removeBenchEntry(ctx, ownerUserId, entryId);
    },

    async createShell(ownerUserId: string, legalName: string): Promise<void> {
      await msmeRepository.createShell(ownerUserId, legalName);
    },

    async getProfileOrNull(ownerUserId: string): Promise<MsmeProfileResponse | null> {
      const profile = await msmeRepository.findByOwnerUserId(ownerUserId);
      if (!profile) return null;
      return toResponse(profile);
    },
  };
}

export type MsmeService = ReturnType<typeof createMsmeService>;

// Convenience: a service instance that throws if no profile (used by routes)
export async function requireProfile(ownerUserId: string): Promise<MsmeProfile> {
  const profile = await msmeRepository.findByOwnerUserId(ownerUserId);
  if (!profile) throw new NotFoundError("MSME profile not found");
  return profile;
}
