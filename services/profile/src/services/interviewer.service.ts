import type { InterviewerProfile } from "../generated/client/index.js";
import type { AuthContext } from "@techorbit/auth-middleware";
import type {
  InterviewerProfileResponse,
  CreateInterviewerProfile,
  UpdateInterviewerProfile,
  SetAvailability,
} from "@techorbit/types";
import { interviewerRepository } from "../repositories/interviewer.repository.js";

function toResponse(p: InterviewerProfile): InterviewerProfileResponse {
  return {
    id: p.id,
    userId: p.userId,
    displayName: p.displayName,
    headline: p.headline,
    bio: p.bio,
    currentRole: p.currentRole,
    currentCompany: p.currentCompany,
    specializations: p.specializations,
    seniorityLevelsCoverable: p.seniorityLevelsCoverable as InterviewerProfileResponse["seniorityLevelsCoverable"],
    interviewTypes: p.interviewTypes as InterviewerProfileResponse["interviewTypes"],
    perInterviewFeeUsd: p.perInterviewFeeUsd,
    timezone: p.timezone,
    videoIntroFileId: p.videoIntroFileId,
    linkedinVerified: p.linkedinVerified,
    calendarProvider: p.calendarProvider as InterviewerProfileResponse["calendarProvider"],
    stripeAccountId: p.stripeAccountId,
    availabilitySlots: p.availabilitySlots as InterviewerProfileResponse["availabilitySlots"],
    status: p.status,
    isProfileComplete: p.isProfileComplete,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function isProfileComplete(p: InterviewerProfile): boolean {
  return !!(
    p.specializations.length > 0 &&
    p.interviewTypes.length > 0 &&
    p.perInterviewFeeUsd !== null &&
    p.timezone
  );
}

export const interviewerService = {
  async getProfile(ctx: AuthContext, userId: string): Promise<InterviewerProfileResponse> {
    const profile = await interviewerRepository.getByUserId(ctx, userId);
    return toResponse(profile);
  },

  async createProfile(
    ctx: AuthContext,
    userId: string,
    body: CreateInterviewerProfile,
  ): Promise<InterviewerProfileResponse> {
    const profile = await interviewerRepository.create(userId, body);

    if (isProfileComplete(profile) && !profile.isProfileComplete) {
      await interviewerRepository.markComplete(userId);
      return toResponse({ ...profile, isProfileComplete: true });
    }
    return toResponse(profile);
  },

  async updateProfile(
    ctx: AuthContext,
    userId: string,
    body: UpdateInterviewerProfile,
  ): Promise<InterviewerProfileResponse> {
    const updated = await interviewerRepository.update(ctx, userId, body);

    if (isProfileComplete(updated) && !updated.isProfileComplete) {
      await interviewerRepository.markComplete(userId);
      return toResponse({ ...updated, isProfileComplete: true });
    }
    return toResponse(updated);
  },

  async setAvailability(
    ctx: AuthContext,
    userId: string,
    body: SetAvailability,
  ): Promise<InterviewerProfileResponse> {
    const updated = await interviewerRepository.setAvailabilitySlots(ctx, userId, body.slots);
    return toResponse(updated);
  },

  async createShell(userId: string): Promise<void> {
    await interviewerRepository.createShell(userId);
  },

  async getProfileOrNull(userId: string): Promise<InterviewerProfileResponse | null> {
    const profile = await interviewerRepository.findByUserId(userId);
    if (!profile) return null;
    return toResponse(profile);
  },
};
