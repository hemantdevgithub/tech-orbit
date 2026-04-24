import type { CandidateProfile } from "../generated/client/index.js";
import { Decimal } from "@prisma/client/runtime/library";
import type { AuthContext } from "@techorbit/auth-middleware";
import type {
  CandidateProfileResponse,
  PublicCandidateProfile,
  UpdateCandidateProfile,
} from "@techorbit/types";
import { NotFoundError, ValidationError } from "@techorbit/errors";
import { candidateRepository } from "../repositories/candidate.repository.js";
import type { InterviewApi } from "../lib/interview-api.js";

export const FEATURED_INTERVIEW_CAP = 6;

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
    featuredInterviewIds: p.featuredInterviewIds,
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

type CandidateServiceDeps = {
  interviewApi: InterviewApi;
};

export function createCandidateService(deps: CandidateServiceDeps) {
  const { interviewApi } = deps;

  return {
    async getProfile(ctx: AuthContext, userId: string): Promise<CandidateProfileResponse> {
      const profile = await candidateRepository.getByUserId(ctx, userId);
      return toResponse(profile);
    },

    async getPublicProfile(userId: string): Promise<PublicCandidateProfile> {
      const profile = await candidateRepository.findByUserId(userId);
      if (!profile) throw new NotFoundError("Candidate profile not found");

      // Resolve featured interviews via S2S. The candidateId filter means a
      // candidate can only feature interviews they took — guards against a
      // candidate pasting someone else's ID into their list.
      const featured =
        profile.featuredInterviewIds.length > 0
          ? await interviewApi.getSummaries(profile.featuredInterviewIds, userId)
          : [];
      // Preserve the candidate's chosen order.
      const featuredById = new Map(featured.map((f) => [f.id, f]));
      const ordered = profile.featuredInterviewIds
        .map((id) => featuredById.get(id))
        .filter((f): f is NonNullable<typeof f> => f !== undefined);

      return {
        userId: profile.userId,
        headline: profile.headline,
        seniority: profile.seniority as PublicCandidateProfile["seniority"],
        location: profile.location,
        featuredInterviews: ordered,
      };
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

    // Candidate curates which interview recordings are featured on their
    // public profile. Validation delegated to interview-svc via S2S: we
    // confirm every ID resolves to an interview owned by this candidate
    // that has a READY recording; anything else is rejected wholesale.
    async setFeaturedInterviews(
      ctx: AuthContext,
      userId: string,
      interviewIds: string[],
    ): Promise<CandidateProfileResponse> {
      if (interviewIds.length > FEATURED_INTERVIEW_CAP) {
        throw new ValidationError(
          `At most ${FEATURED_INTERVIEW_CAP} interviews can be featured`,
        );
      }

      if (new Set(interviewIds).size !== interviewIds.length) {
        throw new ValidationError("Duplicate interview IDs are not allowed");
      }

      if (interviewIds.length > 0) {
        const summaries = await interviewApi.getSummaries(interviewIds, userId);
        const validIds = new Set(
          summaries
            .filter((s) => s.recordingStatus === "READY")
            .map((s) => s.id),
        );
        const invalid = interviewIds.filter((id) => !validIds.has(id));
        if (invalid.length > 0) {
          throw new ValidationError(
            "One or more interviews are not yours or do not have a ready recording",
          );
        }
      }

      const updated = await candidateRepository.setFeaturedInterviews(
        ctx,
        userId,
        interviewIds,
      );
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
}

export type CandidateService = ReturnType<typeof createCandidateService>;
