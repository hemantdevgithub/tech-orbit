import type {
  CancelInterview,
  InterviewFilter,
  InterviewListResponse,
  InterviewResponse,
  InterviewSummary,
  ScheduleInterviewRequest,
  ScorecardRequest,
  ScorecardResponse,
} from "@techorbit/types";
import type { AuthContext } from "@techorbit/auth-middleware";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@techorbit/errors";
import { prisma } from "../lib/prisma.js";
import type { Config } from "../config.js";
import type { DailyApi } from "../lib/daily.js";
import type { MatchingApi } from "../lib/matching-api.js";
import { interviewRepository } from "../repositories/interview.repository.js";
import { scorecardRepository } from "../repositories/scorecard.repository.js";
import { buildEvent, enqueueEvent } from "../lib/outbox.js";
import { toInterviewResponse, toScorecardResponse } from "../lib/response-mappers.js";

type Deps = {
  config: Config;
  dailyApi: DailyApi;
  matchingApi: MatchingApi;
};

function requireCustomerOrAdmin(ctx: AuthContext): void {
  if (!ctx.roles.includes("CUSTOMER") && !ctx.roles.includes("ADMIN")) {
    throw new ForbiddenError("Only customers can schedule interviews");
  }
}

export function createInterviewService(deps: Deps) {
  const { dailyApi, matchingApi } = deps;

  return {
    async scheduleInterview(
      ctx: AuthContext,
      body: ScheduleInterviewRequest,
    ): Promise<InterviewResponse> {
      requireCustomerOrAdmin(ctx);

      const submission = await matchingApi.getSubmission(body.submissionId);
      if (!submission) throw new NotFoundError("Submission not found");

      // Accept SCREENING or INTERVIEWING — customer may schedule before
      // explicitly moving the card to INTERVIEWING.
      const acceptableStatuses = ["SCREENING", "INTERVIEWING", "SUBMITTED"];
      if (!acceptableStatuses.includes(submission.status)) {
        throw new ValidationError(
          `Cannot schedule an interview for a submission in status ${submission.status}`,
        );
      }
      if (submission.candidateId !== body.candidateId) {
        throw new ValidationError("candidateId does not match the submission");
      }

      const start = new Date(body.scheduledStart);
      const end = new Date(body.scheduledEnd);
      if (end <= start) {
        throw new ValidationError("scheduledEnd must be after scheduledStart");
      }

      const conductedByRole = body.interviewerUserId
        ? "PLATFORM_INTERVIEWER"
        : "CUSTOMER_INTERNAL";

      // Create a Daily.co room (or mock).
      const roomName = `interview-${crypto.randomUUID()}`;
      const room = await dailyApi.createRoom(roomName, start, end);

      const created = await prisma.$transaction(async (tx) => {
        const iv = await interviewRepository.create(
          {
            requirementId: body.requirementId,
            submissionId: body.submissionId,
            candidateId: body.candidateId,
            scheduledByUserId: ctx.userId,
            interviewerUserId: body.interviewerUserId ?? null,
            conductedByRole,
            scheduledStart: start,
            scheduledEnd: end,
            videoProviderId: room.name,
            videoRoomUrl: room.url,
          },
          tx,
        );
        const event = buildEvent("interview.scheduled.v1", {
          interviewId: iv.id,
          requirementId: iv.requirementId,
          submissionId: iv.submissionId,
          candidateId: iv.candidateId,
          interviewerUserId: iv.interviewerUserId,
          conductedByRole: iv.conductedByRole,
          scheduledStart: iv.scheduledStart.toISOString(),
          scheduledEnd: iv.scheduledEnd.toISOString(),
          videoRoomUrl: iv.videoRoomUrl,
          scheduledAt: new Date().toISOString(),
        });
        await enqueueEvent(tx, event, iv.id);
        return iv;
      });

      return toInterviewResponse(created);
    },

    async getInterview(ctx: AuthContext, id: string): Promise<InterviewResponse> {
      const iv = await interviewRepository.findById(ctx, id);
      return toInterviewResponse(iv);
    },

    async listInterviews(
      ctx: AuthContext,
      filters: InterviewFilter,
    ): Promise<InterviewListResponse> {
      const { limit, cursor, ...rest } = filters;
      const result = await interviewRepository.list(ctx, rest, cursor ?? null, limit);
      return {
        data: result.data.map(toInterviewResponse),
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      };
    },

    async startInterview(ctx: AuthContext, id: string): Promise<InterviewResponse> {
      const iv = await interviewRepository.findByIdRaw(id);
      if (!iv) throw new NotFoundError("Interview not found");

      const isParticipant =
        ctx.userId === iv.scheduledByUserId ||
        ctx.userId === iv.candidateId ||
        (iv.interviewerUserId !== null && ctx.userId === iv.interviewerUserId) ||
        ctx.roles.includes("ADMIN");
      if (!isParticipant) throw new ForbiddenError("Only participants can start the interview");

      // Idempotent: re-entering the call from the UI shouldn't reset start
      // timestamps or undo a completed interview.
      if (iv.status === "IN_PROGRESS") return toInterviewResponse(iv);
      if (iv.status !== "SCHEDULED") {
        throw new ValidationError(
          `Cannot start an interview in status ${iv.status}`,
        );
      }

      const now = new Date();
      const updated = await interviewRepository.updateStatus(id, "IN_PROGRESS", {
        startedAt: now,
      });
      // Cloud-recording starts automatically when the first participant joins.
      // Flip the bookkeeping status so UI can render "recording" immediately.
      if (iv.videoProviderId && iv.videoRecordingStatus === "NONE") {
        await interviewRepository.markRecordingStarted(id, now);
      }
      return toInterviewResponse(updated);
    },

    async endInterview(ctx: AuthContext, id: string): Promise<InterviewResponse> {
      const iv = await interviewRepository.findByIdRaw(id);
      if (!iv) throw new NotFoundError("Interview not found");

      const isParticipant =
        ctx.userId === iv.scheduledByUserId ||
        ctx.userId === iv.candidateId ||
        (iv.interviewerUserId !== null && ctx.userId === iv.interviewerUserId) ||
        ctx.roles.includes("ADMIN");
      if (!isParticipant) throw new ForbiddenError("Only participants can end the interview");

      const now = new Date();
      const updated = await prisma.$transaction(async (tx) => {
        const ended = await interviewRepository.updateStatus(id, "COMPLETED", { endedAt: now }, tx);
        if (iv.videoProviderId && iv.videoRecordingStatus !== "NONE") {
          await interviewRepository.markRecordingProcessing(id, now, tx);
        }
        const event = buildEvent("interview.completed.v1", {
          interviewId: ended.id,
          candidateId: ended.candidateId,
          interviewerUserId: ended.interviewerUserId,
          endedAt: now.toISOString(),
        });
        await enqueueEvent(tx, event, ended.id);
        return ended;
      });

      // Async recording fetch — best effort, don't block the response.
      if (iv.videoProviderId) {
        void this.processRecording(id).catch(() => {
          // non-fatal
        });
      }

      return toInterviewResponse(updated);
    },

    // Transition a PROCESSING recording to READY by fetching metadata from
    // the provider. Safe to call repeatedly — a no-op once status is READY.
    // Called: (1) immediately after endInterview (mock returns synchronously),
    // (2) by a cron poller for long-running Daily.co cloud recordings.
    async processRecording(id: string): Promise<void> {
      const iv = await interviewRepository.findByIdRaw(id);
      if (!iv || !iv.videoProviderId) return;
      if (iv.videoRecordingStatus === "READY" || iv.videoRecordingStatus === "NONE") return;

      const recording = await dailyApi.getRecording(iv.videoProviderId);
      if (!recording) return; // stay PROCESSING; poller will retry

      await interviewRepository.setRecording(id, {
        fileId: null,
        downloadUrl: recording.downloadUrl,
        durationSec: recording.durationSec,
      });
    },

    async cancelInterview(
      ctx: AuthContext,
      id: string,
      body: CancelInterview,
    ): Promise<InterviewResponse> {
      const cancelled = await prisma.$transaction(async (tx) => {
        const iv = await interviewRepository.cancel(ctx, id, body.reason, tx);

        // Best-effort Daily.co room deletion — don't fail if room is already gone.
        if (iv.videoProviderId) {
          void dailyApi.deleteRoom(iv.videoProviderId).catch(() => undefined);
        }
        return iv;
      });
      return toInterviewResponse(cancelled);
    },

    async submitScorecard(
      ctx: AuthContext,
      body: ScorecardRequest,
    ): Promise<ScorecardResponse> {
      const sc = await prisma.$transaction(async (tx) => {
        const scorecard = await scorecardRepository.create(
          ctx,
          {
            interviewId: body.interviewId,
            recommendation: body.recommendation,
            technicalScore: body.technicalScore ?? null,
            communicationScore: body.communicationScore ?? null,
            problemSolvingScore: body.problemSolvingScore ?? null,
            culturalFitScore: body.culturalFitScore ?? null,
            freeformFeedback: body.freeformFeedback,
            redFlags: body.redFlags ?? null,
            wouldHireAgain: body.wouldHireAgain ?? null,
            submittedBy: ctx.userId,
          },
          tx,
        );

        // Look up interview for event payload
        const iv = await tx.interview.findUnique({ where: { id: body.interviewId } });
        if (!iv) throw new NotFoundError("Interview not found");

        const event = buildEvent("scorecard.submitted.v1", {
          scorecardId: scorecard.id,
          interviewId: scorecard.interviewId,
          candidateId: iv.candidateId,
          interviewerUserId: iv.interviewerUserId,
          recommendation: scorecard.recommendation,
          submittedBy: scorecard.submittedBy,
          submittedAt: scorecard.submittedAt.toISOString(),
        });
        await enqueueEvent(tx, event, scorecard.id);
        return scorecard;
      });
      return toScorecardResponse(sc);
    },

    async getScorecard(ctx: AuthContext, interviewId: string): Promise<ScorecardResponse | null> {
      const sc = await scorecardRepository.findByInterview(ctx, interviewId);
      return sc ? toScorecardResponse(sc) : null;
    },

    // Service-to-service: batch-resolve interviews to narrow summaries. Used by
    // profile-svc to embed a candidate's featured interviews in the public
    // profile response. Only returns interviews for `candidateId` (filter
    // applied by caller), with recording URLs included.
    async getSummariesByIds(
      ids: string[],
      candidateId?: string,
    ): Promise<InterviewSummary[]> {
      if (ids.length === 0) return [];
      const rows = await interviewRepository.findManyByIds(ids);
      const scored = await scorecardRepository.findManyByInterviewIds(
        rows.map((r) => r.id),
      );
      const scMap = new Map(scored.map((s) => [s.interviewId, s]));

      return rows
        .filter((iv) => !candidateId || iv.candidateId === candidateId)
        .map((iv) => {
          const sc = scMap.get(iv.id);
          const dims = [
            sc?.technicalScore,
            sc?.communicationScore,
            sc?.problemSolvingScore,
            sc?.culturalFitScore,
          ].filter((v): v is number => typeof v === "number");
          const overallScore =
            dims.length > 0
              ? Number(
                  (dims.reduce((a, b) => a + b, 0) / dims.length).toFixed(2),
                )
              : null;
          return {
            id: iv.id,
            scheduledStart: iv.scheduledStart.toISOString(),
            durationSec: iv.videoRecordingDurationSec,
            conductedByRole: iv.conductedByRole,
            recordingStatus: iv.videoRecordingStatus,
            recordingUrl:
              iv.videoRecordingStatus === "READY"
                ? iv.videoRecordingUrl
                : null,
            recommendation: sc?.recommendation ?? null,
            overallScore,
          } satisfies InterviewSummary;
        });
    },
  };
}

export type InterviewService = ReturnType<typeof createInterviewService>;
