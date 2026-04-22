import type { CandidateProfile } from "../generated/client/index.js";
import { Decimal } from "@prisma/client/runtime/library";
import type { AuthContext } from "@techorbit/auth-middleware";
import type { CandidateProfileResponse, UpdateCandidateProfile } from "@techorbit/types";
import { candidateRepository } from "../repositories/candidate.repository.js";

function toResponse(p: CandidateProfile): CandidateProfileResponse {
  return {
    id: p.id,
    userId: p.userId,
    headline: p.headline,
    bio: p.bio,
    location: p.location,
    seniority: p.seniority as CandidateProfileResponse["seniority"],
    skills: p.skills,
    workAuthStatus: p.workAuthStatus as CandidateProfileResponse["workAuthStatus"],
    workAuthExpiry: p.workAuthExpiry?.toISOString() ?? null,
    availableFrom: p.availableFrom?.toISOString() ?? null,
    rateMin: p.rateMin,
    rateMax: p.rateMax,
    preferRemote: p.preferRemote,
    preferHybrid: p.preferHybrid,
    preferOnsite: p.preferOnsite,
    locationPreference: p.locationPreference,
    resumeFileId: p.resumeFileId,
    backgroundCheckStatus: p.backgroundCheckStatus,
    kycVerified: p.kycVerified,
    averageRating:
      p.averageRating instanceof Decimal ? p.averageRating.toFixed(2) : (p.averageRating as string | null),
    ratingCount: p.ratingCount,
    isProfileComplete: p.isProfileComplete,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function isProfileComplete(p: CandidateProfile): boolean {
  return !!(
    p.headline &&
    p.skills.length > 0 &&
    p.workAuthStatus &&
    p.seniority
  );
}

export const candidateService = {
  async getProfile(ctx: AuthContext, userId: string): Promise<CandidateProfileResponse> {
    const profile = await candidateRepository.getByUserId(ctx, userId);
    return toResponse(profile);
  },

  async updateProfile(
    ctx: AuthContext,
    userId: string,
    body: UpdateCandidateProfile,
  ): Promise<CandidateProfileResponse> {
    const data = {
      ...body,
      workAuthExpiry:
        body.workAuthExpiry !== undefined
          ? body.workAuthExpiry === null ? null : new Date(body.workAuthExpiry)
          : undefined,
      availableFrom:
        body.availableFrom !== undefined
          ? body.availableFrom === null ? null : new Date(body.availableFrom)
          : undefined,
    };

    const updated = await candidateRepository.upsert(ctx, userId, data);

    if (isProfileComplete(updated) && !updated.isProfileComplete) {
      await candidateRepository.markComplete(userId);
      return toResponse({ ...updated, isProfileComplete: true });
    }

    return toResponse(updated);
  },

  async attachResume(
    ctx: AuthContext,
    userId: string,
    fileId: string,
  ): Promise<CandidateProfileResponse> {
    const updated = await candidateRepository.updateResumeFileId(ctx, userId, fileId);
    return toResponse(updated);
  },

  async startKyc(
    ctx: AuthContext,
    userId: string,
  ): Promise<{ sessionUrl: string; sessionId: string; isMock: boolean }> {
    // KYC is mocked for now — real provider integration (e.g. Persona) goes here
    const profile = await candidateRepository.findByUserId(userId);
    if (!profile) {
      await candidateRepository.createShell(userId);
    }
    const sessionId = `mock_kyc_${userId}_${Date.now()}`;
    return {
      sessionUrl: `https://mock-kyc.techorbit.dev/session/${sessionId}`,
      sessionId,
      isMock: true,
    };
  },

  async createShell(userId: string): Promise<void> {
    await candidateRepository.createShell(userId);
  },
};
