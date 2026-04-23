import type {
  SubmissionRequest,
  SubmissionResponse,
  SubmissionListResponse,
  SubmissionFilter,
  UpdateSubmissionStatus,
  WithdrawSubmission,
  MatchingSignalResponse,
} from "@techorbit/types";
import type { AuthContext } from "@techorbit/auth-middleware";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@techorbit/errors";
import { prisma } from "../lib/prisma.js";
import type { Config } from "../config.js";
import type { ProfileApi } from "../lib/profile-api.js";
import type { RequirementApi } from "../lib/requirement-api.js";
import { submissionRepository, submissionAuth } from "../repositories/submission.repository.js";
import { matchingSignalRepository } from "../repositories/matching-signal.repository.js";
import { buildEvent, enqueueEvent } from "../lib/outbox.js";
import { toSubmissionResponse, toMatchingSignalResponse } from "../lib/response-mappers.js";
import {
  computeMatchSignal,
  type MatchRequirementInput,
  type MatchCandidateInput,
} from "./matching-engine.js";
import type { SubmitterRole } from "../generated/client/index.js";

type SubmissionServiceDeps = {
  config: Config;
  profileApi: ProfileApi;
  requirementApi: RequirementApi;
};

function pickSubmitterRole(ctx: AuthContext): SubmitterRole {
  if (ctx.roles.includes("SRM")) return "SRM";
  if (ctx.roles.includes("MSME")) return "MSME";
  if (ctx.roles.includes("CANDIDATE") || ctx.roles.includes("ADMIN")) {
    return "CANDIDATE_SELF";
  }
  throw new ForbiddenError("Caller has no role that can submit");
}

export function createSubmissionService(deps: SubmissionServiceDeps) {
  const { profileApi, requirementApi } = deps;

  return {
    async createSubmission(
      ctx: AuthContext,
      body: SubmissionRequest,
      bearerToken: string,
    ): Promise<SubmissionResponse> {
      const submitterRole = pickSubmitterRole(ctx);

      // Candidates can only submit themselves.  SRMs/MSMEs supply any
      // candidateId; verification that they actually rep that candidate
      // lands in Sprint 5 (bench linkage / network membership).
      if (submitterRole === "CANDIDATE_SELF" && body.candidateId !== ctx.userId) {
        throw new ForbiddenError("Candidates can only submit themselves");
      }

      // Duplicate guard — one submission per (requirement, candidate).  The
      // DB-level unique index enforces this too; we check early for a clean
      // 409 error message.
      const existing = await submissionRepository.findByPair(
        body.requirementId,
        body.candidateId,
      );
      if (existing) {
        throw new ConflictError("A submission for this candidate already exists");
      }

      const requirement = await requirementApi.getRequirement(body.requirementId);
      if (!requirement) throw new NotFoundError("Requirement not found");
      if (requirement.status !== "OPEN") {
        throw new ValidationError(
          `Cannot submit to a requirement in status ${requirement.status}`,
        );
      }

      const candidate = await profileApi.getCandidateByUserId(
        body.candidateId,
        bearerToken,
      );
      if (!candidate) {
        throw new NotFoundError("Candidate profile not found or inaccessible");
      }
      if (!candidate.isProfileComplete) {
        throw new ValidationError(
          "Candidate profile is incomplete; cannot submit until the profile is finished",
        );
      }

      // Resolve match score: prefer a precomputed MatchingSignal; fall back
      // to an on-the-fly compute so submissions from candidates created
      // after publish still get a score.
      let matchScore: number | null = null;
      const precomputed = await matchingSignalRepository.findForPair(
        body.requirementId,
        body.candidateId,
      );
      if (precomputed) {
        matchScore = precomputed.matchScore;
      } else {
        const reqInput: MatchRequirementInput = {
          techStack: requirement.techStack,
          seniority: requirement.seniority,
          locationType: requirement.locationType,
          locationCity: requirement.locationCity,
          workAuthPrefs:
            requirement.workAuthPrefs as MatchRequirementInput["workAuthPrefs"],
        };
        const candInput: MatchCandidateInput = {
          skills: candidate.skills,
          seniority: candidate.seniority as MatchCandidateInput["seniority"],
          location: candidate.location,
          preferRemote: candidate.preferRemote,
          preferHybrid: candidate.preferHybrid,
          preferOnsite: candidate.preferOnsite,
          workAuthStatus: candidate.workAuthStatus,
          averageRating: candidate.averageRating,
        };
        const signal = computeMatchSignal(reqInput, candInput);
        matchScore = signal.matchScore;
        await matchingSignalRepository.upsert(
          body.requirementId,
          body.candidateId,
          signal,
        );
      }

      const attributedSrmId = submitterRole === "SRM" ? ctx.userId : null;
      const attributedMsmeId = submitterRole === "MSME" ? ctx.userId : null;

      const created = await prisma.$transaction(async (tx) => {
        const row = await submissionRepository.create(
          {
            requirementId: body.requirementId,
            candidateId: body.candidateId,
            submittedByUserId: ctx.userId,
            submitterRole,
            attributedSrmId,
            attributedMsmeId,
            matchScore,
            coverNote: body.coverNote ?? null,
            proposedBillRate: body.proposedBillRate ?? null,
          },
          tx,
        );
        const event = buildEvent("submission.created.v1", {
          submissionId: row.id,
          requirementId: row.requirementId,
          candidateId: row.candidateId,
          submittedByUserId: row.submittedByUserId,
          submitterRole: row.submitterRole,
          attributedSrmId: row.attributedSrmId,
          attributedMsmeId: row.attributedMsmeId,
          matchScore: row.matchScore,
          createdAt: row.createdAt.toISOString(),
        });
        await enqueueEvent(tx, event, row.id);
        return row;
      });

      return toSubmissionResponse(created);
    },

    async getSubmission(
      ctx: AuthContext,
      id: string,
    ): Promise<SubmissionResponse> {
      const row = await submissionRepository.findByIdRaw(id);
      if (!row) throw new NotFoundError("Submission not found");

      // Visibility: submitter, attributed SRM/MSME, requirement owner, or admin.
      // Owner check requires a requirement-svc call.
      const isSubmitter = submissionAuth.isSubmitter(ctx, row);
      const isSrm = submissionAuth.isAttributedSrm(ctx, row);
      const isMsme = submissionAuth.isAttributedMsme(ctx, row);
      const isAdmin = submissionAuth.hasAdminRole(ctx);

      if (!isSubmitter && !isSrm && !isMsme && !isAdmin) {
        const req = await requirementApi.getRequirement(row.requirementId);
        if (!req || req.createdByUserId !== ctx.userId) {
          throw new ForbiddenError("Cannot access this submission");
        }
      }

      return toSubmissionResponse(row);
    },

    async listSubmissions(
      ctx: AuthContext,
      filters: SubmissionFilter,
    ): Promise<SubmissionListResponse> {
      const isAdmin = submissionAuth.hasAdminRole(ctx);
      const { limit, cursor, ...rest } = filters;

      // Scope resolution:
      // - Admins see everything.
      // - Otherwise: the caller sees submissions they submitted AND (if they
      //   own the filtered requirement) all submissions for that requirement.
      let ownedRequirementIds: string[] | undefined;
      if (!isAdmin && filters.requirementId) {
        const req = await requirementApi.getRequirement(filters.requirementId);
        if (req && req.createdByUserId === ctx.userId) {
          ownedRequirementIds = [filters.requirementId];
        }
      }

      const result = await submissionRepository.list(
        {
          requirementId: rest.requirementId,
          candidateId: rest.candidateId,
          status: rest.status,
          submitterRole: rest.submitterRole,
          ...(isAdmin
            ? {}
            : {
                submittedByUserId: ctx.userId,
                ownedRequirementIds,
              }),
        },
        cursor ?? null,
        limit,
      );

      return {
        data: result.data.map(toSubmissionResponse),
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      };
    },

    async updateSubmissionStatus(
      ctx: AuthContext,
      id: string,
      body: UpdateSubmissionStatus,
    ): Promise<SubmissionResponse> {
      const row = await submissionRepository.findByIdRaw(id);
      if (!row) throw new NotFoundError("Submission not found");

      // Only the requirement owner (or admin) can change status.
      const isAdmin = submissionAuth.hasAdminRole(ctx);
      if (!isAdmin) {
        const req = await requirementApi.getRequirement(row.requirementId);
        if (!req || req.createdByUserId !== ctx.userId) {
          throw new ForbiddenError("Only the requirement owner can change submission status");
        }
      }

      // Guard against overwriting a terminal status.
      if (row.status === "WITHDRAWN") {
        throw new ConflictError("Cannot change status of a withdrawn submission");
      }

      const updated = await prisma.$transaction(async (tx) => {
        const next = await submissionRepository.updateStatus(
          id,
          body.status,
          body.rejectionReason ?? null,
          tx,
        );
        const event = buildEvent("submission.status_changed.v1", {
          submissionId: next.id,
          requirementId: next.requirementId,
          candidateId: next.candidateId,
          fromStatus: row.status,
          toStatus: next.status,
          changedByUserId: ctx.userId,
          changedAt: new Date().toISOString(),
        });
        await enqueueEvent(tx, event, next.id);
        return next;
      });

      return toSubmissionResponse(updated);
    },

    async withdrawSubmission(
      ctx: AuthContext,
      id: string,
      body: WithdrawSubmission,
    ): Promise<SubmissionResponse> {
      const updated = await prisma.$transaction(async (tx) => {
        const row = await submissionRepository.withdraw(ctx, id, body.reason, tx);
        const event = buildEvent("submission.withdrawn.v1", {
          submissionId: row.id,
          requirementId: row.requirementId,
          candidateId: row.candidateId,
          reason: body.reason,
          withdrawnAt: row.withdrawnAt!.toISOString(),
        });
        await enqueueEvent(tx, event, row.id);
        return row;
      });
      return toSubmissionResponse(updated);
    },

    async listMatchesForRequirement(
      ctx: AuthContext,
      requirementId: string,
      limit: number,
    ): Promise<MatchingSignalResponse[]> {
      // Gate on requirement ownership (or admin).  Attributed CRMs can
      // peek too — same pattern as requirement-svc's getRequirement.
      const isAdmin = submissionAuth.hasAdminRole(ctx);
      if (!isAdmin) {
        const req = await requirementApi.getRequirement(requirementId);
        if (!req) throw new NotFoundError("Requirement not found");
        const isOwner = req.createdByUserId === ctx.userId;
        const isCrm =
          req.attributedCrmId !== null && req.attributedCrmId === ctx.userId;
        if (!isOwner && !isCrm) {
          throw new ForbiddenError("Cannot view matches for this requirement");
        }
      }

      const rows = await matchingSignalRepository.findForRequirement(
        requirementId,
        limit,
      );
      return rows.map(toMatchingSignalResponse);
    },
  };
}

export type SubmissionService = ReturnType<typeof createSubmissionService>;
