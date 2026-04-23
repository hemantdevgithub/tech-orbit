import { Decimal } from "@prisma/client/runtime/library";
import type { Interview, Scorecard } from "../generated/client/index.js";
import type { InterviewResponse, ScorecardResponse } from "@techorbit/types";

export function toInterviewResponse(iv: Interview): InterviewResponse {
  return {
    id: iv.id,
    requirementId: iv.requirementId,
    submissionId: iv.submissionId,
    candidateId: iv.candidateId,
    scheduledByUserId: iv.scheduledByUserId,
    interviewerUserId: iv.interviewerUserId,
    conductedByRole: iv.conductedByRole,
    scheduledStart: iv.scheduledStart.toISOString(),
    scheduledEnd: iv.scheduledEnd.toISOString(),
    videoRoomUrl: iv.videoRoomUrl,
    videoRecordingUrl: iv.videoRecordingUrl,
    status: iv.status,
    startedAt: iv.startedAt?.toISOString() ?? null,
    endedAt: iv.endedAt?.toISOString() ?? null,
    cancelledAt: iv.cancelledAt?.toISOString() ?? null,
    cancelledBy: iv.cancelledBy,
    cancelReason: iv.cancelReason,
    interviewerFeeUsd:
      iv.interviewerFeeUsd instanceof Decimal
        ? Number(iv.interviewerFeeUsd.toFixed(2))
        : iv.interviewerFeeUsd === null
          ? null
          : Number(iv.interviewerFeeUsd),
    createdAt: iv.createdAt.toISOString(),
    updatedAt: iv.updatedAt.toISOString(),
  };
}

export function toScorecardResponse(sc: Scorecard): ScorecardResponse {
  return {
    id: sc.id,
    interviewId: sc.interviewId,
    recommendation: sc.recommendation,
    technicalScore: sc.technicalScore,
    communicationScore: sc.communicationScore,
    problemSolvingScore: sc.problemSolvingScore,
    culturalFitScore: sc.culturalFitScore,
    freeformFeedback: sc.freeformFeedback,
    redFlags: sc.redFlags,
    wouldHireAgain: sc.wouldHireAgain,
    submittedAt: sc.submittedAt.toISOString(),
    submittedBy: sc.submittedBy,
  };
}
