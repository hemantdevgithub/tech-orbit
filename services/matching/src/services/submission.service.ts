import type {
  AssignMsme,
  DeclineInvite,
  InviteCandidate,
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

    // Sprint 12 — SRM invites a candidate from their APPROVED portfolio to
    // apply for a requirement they're assigned to. Creates a Submission with
    // status INVITED; the candidate must accept (→ SUBMITTED) or decline
    // (→ WITHDRAWN) before the submission enters the screening pipeline.
    async inviteCandidate(
      ctx: AuthContext,
      requirementId: string,
      body: InviteCandidate,
    ): Promise<SubmissionResponse> {
      if (!ctx.roles.includes("SRM") && !ctx.roles.includes("ADMIN")) {
        throw new ForbiddenError("Only SRMs can invite candidates");
      }

      const requirement = await requirementApi.getRequirement(requirementId);
      if (!requirement) throw new NotFoundError("Requirement not found");
      if (requirement.status !== "OPEN") {
        throw new ValidationError(
          `Cannot invite to a requirement in status ${requirement.status}`,
        );
      }
      // Caller must be the assigned SRM (or admin).
      if (
        !ctx.roles.includes("ADMIN") &&
        requirement.assignedSrmId !== ctx.userId
      ) {
        throw new ForbiddenError(
          "You can only invite candidates to requirements assigned to you",
        );
      }

      // Candidate must be in this SRM's APPROVED portfolio.
      if (!ctx.roles.includes("ADMIN")) {
        const inRoster = await profileApi.hasApprovedPortfolioLink({
          srmUserId: ctx.userId,
          memberUserId: body.candidateId,
          memberType: "CANDIDATE",
        });
        if (!inRoster) {
          throw new ForbiddenError(
            "Candidate is not in your approved portfolio",
          );
        }
      }

      // Duplicate guard: one submission per (requirement, candidate).
      const existing = await submissionRepository.findByPair(
        requirementId,
        body.candidateId,
      );
      if (existing) {
        throw new ConflictError(
          `A submission for this candidate already exists (status=${existing.status})`,
        );
      }

      const created = await prisma.$transaction(async (tx) => {
        const row = await submissionRepository.createInvited(
          {
            requirementId,
            candidateId: body.candidateId,
            invitedBySrmId: ctx.userId,
            coverNote: body.coverNote ?? null,
          },
          tx,
        );
        const event = buildEvent("submission.invited.v1", {
          submissionId: row.id,
          requirementId: row.requirementId,
          candidateId: row.candidateId,
          invitedBySrmId: ctx.userId,
          invitedAt: row.invitedAt!.toISOString(),
        });
        await enqueueEvent(tx, event, row.id);
        return row;
      });

      return toSubmissionResponse(created);
    },

    // The invited candidate accepts the invitation. Transitions INVITED → SUBMITTED
    // and emits submission.invite-accepted.v1 (notifies the SRM) plus the regular
    // submission.created.v1 so the standard screening pipeline picks it up.
    async acceptInvite(
      ctx: AuthContext,
      submissionId: string,
    ): Promise<SubmissionResponse> {
      const row = await submissionRepository.findByIdRaw(submissionId);
      if (!row) throw new NotFoundError("Submission not found");
      if (row.candidateId !== ctx.userId && !ctx.roles.includes("ADMIN")) {
        throw new ForbiddenError("Only the invited candidate can accept");
      }
      if (row.status !== "INVITED") {
        throw new ConflictError(
          `Submission is not pending (status=${row.status})`,
        );
      }
      const updated = await prisma.$transaction(async (tx) => {
        const next = await submissionRepository.acceptInvite(submissionId, tx);
        const acceptedAt = next.inviteAcceptedAt!.toISOString();
        const accEvent = buildEvent("submission.invite-accepted.v1", {
          submissionId: next.id,
          requirementId: next.requirementId,
          candidateId: next.candidateId,
          invitedBySrmId: next.invitedBySrmId,
          acceptedAt,
        });
        await enqueueEvent(tx, accEvent, next.id);
        // Reuse the regular submission.created pipeline so downstream
        // matching / notification consumers run.
        const createdEvent = buildEvent("submission.created.v1", {
          submissionId: next.id,
          requirementId: next.requirementId,
          candidateId: next.candidateId,
          submittedByUserId: next.submittedByUserId,
          submitterRole: next.submitterRole,
          attributedSrmId: next.attributedSrmId,
          attributedMsmeId: next.attributedMsmeId,
          matchScore: next.matchScore,
          createdAt: next.createdAt.toISOString(),
        });
        await enqueueEvent(tx, createdEvent, next.id);
        return next;
      });
      return toSubmissionResponse(updated);
    },

    async declineInvite(
      ctx: AuthContext,
      submissionId: string,
      body: DeclineInvite,
    ): Promise<SubmissionResponse> {
      const row = await submissionRepository.findByIdRaw(submissionId);
      if (!row) throw new NotFoundError("Submission not found");
      if (row.candidateId !== ctx.userId && !ctx.roles.includes("ADMIN")) {
        throw new ForbiddenError("Only the invited candidate can decline");
      }
      if (row.status !== "INVITED") {
        throw new ConflictError(
          `Submission is not pending (status=${row.status})`,
        );
      }
      const updated = await prisma.$transaction(async (tx) => {
        const next = await submissionRepository.declineInvite(
          submissionId,
          body.reason,
          tx,
        );
        const event = buildEvent("submission.invite-declined.v1", {
          submissionId: next.id,
          requirementId: next.requirementId,
          candidateId: next.candidateId,
          invitedBySrmId: next.invitedBySrmId,
          declinedAt: next.inviteDeclinedAt!.toISOString(),
          reason: body.reason,
        });
        await enqueueEvent(tx, event, next.id);
        return next;
      });
      return toSubmissionResponse(updated);
    },

    // Sprint 12 — SRM assigns an MSME (from their approved portfolio) to
    // source a bench consultant for the requirement. No Submission row is
    // created; emitting requirement.assigned-msme.v1 notifies the MSME, who
    // then submits via the normal POST /submissions when they pick a bench
    // candidate.
    async assignToMsme(
      ctx: AuthContext,
      requirementId: string,
      body: AssignMsme,
    ): Promise<{ ok: true }> {
      if (!ctx.roles.includes("SRM") && !ctx.roles.includes("ADMIN")) {
        throw new ForbiddenError("Only SRMs can assign an MSME");
      }
      const requirement = await requirementApi.getRequirement(requirementId);
      if (!requirement) throw new NotFoundError("Requirement not found");
      if (requirement.status !== "OPEN") {
        throw new ValidationError(
          `Cannot assign on a requirement in status ${requirement.status}`,
        );
      }
      if (
        !ctx.roles.includes("ADMIN") &&
        requirement.assignedSrmId !== ctx.userId
      ) {
        throw new ForbiddenError(
          "You can only assign MSMEs to requirements assigned to you",
        );
      }
      if (!ctx.roles.includes("ADMIN")) {
        const inRoster = await profileApi.hasApprovedPortfolioLink({
          srmUserId: ctx.userId,
          memberUserId: body.msmePrimaryUserId,
          memberType: "MSME",
        });
        if (!inRoster) {
          throw new ForbiddenError("MSME is not in your approved portfolio");
        }
      }
      // Emit-only flow — no DB row written. Idempotency is handled by the
      // notification-svc ProcessedEvent dedupe.
      await prisma.$transaction(async (tx) => {
        const event = buildEvent("requirement.assigned-msme.v1", {
          requirementId,
          msmePrimaryUserId: body.msmePrimaryUserId,
          assignedBySrmId: ctx.userId,
          requirementTitle: requirement.title,
        });
        await enqueueEvent(tx, event, requirementId);
      });
      return { ok: true };
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
