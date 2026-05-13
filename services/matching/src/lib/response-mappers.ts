import { Decimal } from "@prisma/client/runtime/library";
import type { MatchingSignal, Submission } from "../generated/client/index.js";
import type {
  MatchingSignalResponse,
  SubmissionResponse,
} from "@techorbit/types";

export function toSubmissionResponse(s: Submission): SubmissionResponse {
  return {
    id: s.id,
    requirementId: s.requirementId,
    candidateId: s.candidateId,
    submittedByUserId: s.submittedByUserId,
    submitterRole: s.submitterRole,
    attributedSrmId: s.attributedSrmId,
    attributedMsmeId: s.attributedMsmeId,
    status: s.status,
    matchScore: s.matchScore,
    coverNote: s.coverNote,
    proposedBillRate:
      s.proposedBillRate instanceof Decimal
        ? Number(s.proposedBillRate.toFixed(2))
        : s.proposedBillRate === null
          ? null
          : Number(s.proposedBillRate),
    withdrawnAt: s.withdrawnAt?.toISOString() ?? null,
    withdrawnReason: s.withdrawnReason,
    rejectedAt: s.rejectedAt?.toISOString() ?? null,
    rejectionReason: s.rejectionReason,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export function toMatchingSignalResponse(m: MatchingSignal): MatchingSignalResponse {
  return {
    id: m.id,
    requirementId: m.requirementId,
    candidateId: m.candidateId,
    skillOverlap: m.skillOverlap,
    seniorityMatch: m.seniorityMatch,
    locationMatch: m.locationMatch,
    workAuthMatch: m.workAuthMatch,
    candidateRating:
      m.candidateRating instanceof Decimal
        ? Number(m.candidateRating.toFixed(2))
        : Number(m.candidateRating),
    matchScore: m.matchScore,
    computedAt: m.computedAt.toISOString(),
  };
}
