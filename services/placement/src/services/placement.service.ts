import { Decimal } from "decimal.js";
import { Decimal as PrismaDecimal } from "@prisma/client/runtime/library";
import type { Prisma } from "../generated/client/index.js";
import type {
  CommissionRuleListResponse,
  CreatePlacementRequest,
  EndPlacement,
  PlacementFilter,
  PlacementListResponse,
  PlacementResponse,
  ValueChainResponse,
} from "@techorbit/types";
import type { AuthContext } from "@techorbit/auth-middleware";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@techorbit/errors";
import { prisma } from "../lib/prisma.js";
import type { InterviewApi } from "../lib/interview-api.js";
import type { MatchingApi } from "../lib/matching-api.js";
import type { RequirementApi } from "../lib/requirement-api.js";
import { placementRepository } from "../repositories/placement.repository.js";
import { commissionRuleRepository } from "../repositories/commission-rule.repository.js";
import {
  filterCommissionRules,
  filterValueChain,
  resolveViewerRole,
} from "../lib/value-chain-filter.js";
import {
  toCommissionRuleResponse,
  toPlacementResponse,
  toValueChainResponse,
} from "../lib/response-mappers.js";
import {
  calculateCommissionRules,
  type CommissionInput,
} from "./commission-calculator.js";
import type { Config } from "../config.js";
import { randomUUID } from "node:crypto";

type Deps = {
  config: Config;
  matchingApi: MatchingApi;
  requirementApi: RequirementApi;
  interviewApi: InterviewApi;
};

function requireCustomerOrAdmin(ctx: AuthContext): void {
  if (!ctx.roles.includes("CUSTOMER") && !ctx.roles.includes("ADMIN")) {
    throw new ForbiddenError("Only customers can create placements");
  }
}

// Strict set of submission statuses from which a placement can be created.
// Decision logged in SPRINT_6_PROMPT plan: OFFER only.
const ALLOWED_SUBMISSION_STATUSES = ["OFFER"] as const;

export function createPlacementService(deps: Deps) {
  const { matchingApi, requirementApi, interviewApi } = deps;

  return {
    async createPlacement(
      ctx: AuthContext,
      body: CreatePlacementRequest,
    ): Promise<{
      placement: PlacementResponse;
      valueChain: ValueChainResponse;
      rules: CommissionRuleListResponse;
    }> {
      requireCustomerOrAdmin(ctx);

      // 1. Resolve the submission.
      const submission = await matchingApi.getSubmission(body.submissionId);
      if (!submission) throw new NotFoundError("Submission not found");
      if (!ALLOWED_SUBMISSION_STATUSES.includes(submission.status as typeof ALLOWED_SUBMISSION_STATUSES[number])) {
        throw new ValidationError(
          `Submission must be in OFFER status to create a placement (current: ${submission.status})`,
        );
      }

      // Prevent duplicate placements on the same submission.
      const existing = await prisma.placement.findUnique({
        where: { submissionId: body.submissionId },
      });
      if (existing) {
        throw new ConflictError("A placement already exists for this submission");
      }

      // 2. Resolve the requirement for CRM attribution + customerCompanyId.
      const requirement = await requirementApi.getRequirement(submission.requirementId);
      if (!requirement) throw new NotFoundError("Requirement not found");
      if (requirement.createdByUserId !== ctx.userId && !ctx.roles.includes("ADMIN")) {
        throw new ForbiddenError("Only the requirement owner can place candidates");
      }

      // 3. Resolve completed interviews (for Value Chain + interviewer fees).
      const completedInterviews = await interviewApi.listCompletedForSubmission(body.submissionId);

      const interviewerFees = completedInterviews
        .filter((iv) => iv.interviewerUserId !== null)
        .map((iv) => ({
          interviewId: iv.id,
          interviewerUserId: iv.interviewerUserId!,
          feeUsd: new Decimal(iv.interviewerFeeUsd ?? 150),
        }));

      // 4. Build the commission input.
      const input: CommissionInput = {
        engagementType: body.engagementType,
        billRateUsd: new Decimal(body.billRateUsd),
        payRateUsd: body.payRateUsd !== undefined ? new Decimal(body.payRateUsd) : null,
        attributedCrmId: requirement.attributedCrmId,
        attributedSrmId: submission.attributedSrmId,
        attributedMsmeId: body.engagementType === "C2C" ? submission.attributedMsmeId : null,
        candidateId: submission.candidateId,
        interviewerFees,
      };

      const ruleDrafts = calculateCommissionRules(input);

      // 5. Write the placement + value chain + rules + outbox event in ONE txn.
      const eventId = randomUUID();
      const placementId = randomUUID();

      const outboxPayload = {
        eventId,
        type: "placement.created.v1",
        version: 1 as const,
        occurredAt: new Date().toISOString(),
        payload: {
          placementId,
          requirementId: requirement.id,
          submissionId: body.submissionId,
          candidateId: submission.candidateId,
          customerCompanyId: requirement.customerCompanyId,
          engagementType: body.engagementType,
          billRateUsd: Number(body.billRateUsd),
          payRateUsd: body.payRateUsd ?? null,
          startDate: body.startDate,
          endDate: body.endDate,
          attributedCrmId: requirement.attributedCrmId,
          attributedSrmId: submission.attributedSrmId,
          attributedMsmeId: body.engagementType === "C2C" ? submission.attributedMsmeId : null,
          interviewerIds: Array.from(new Set(interviewerFees.map((f) => f.interviewerUserId))),
          createdAt: new Date().toISOString(),
        },
      };

      const result = await prisma.$transaction(async (tx) => {
        return placementRepository.createWithChainAndRules(
          {
            requirementId: requirement.id,
            submissionId: body.submissionId,
            candidateId: submission.candidateId,
            customerCompanyId: requirement.customerCompanyId,
            createdByUserId: ctx.userId,
            engagementType: body.engagementType,
            billRateUsd: new PrismaDecimal(String(body.billRateUsd)),
            payRateUsd: body.payRateUsd !== undefined
              ? new PrismaDecimal(String(body.payRateUsd))
              : null,
            startDate: new Date(body.startDate),
            endDate: new Date(body.endDate),
            contractDocumentId: body.contractDocumentId ?? null,
            workOrderId: body.workOrderId ?? null,
            rtrDocumentId: body.rtrDocumentId ?? null,
          },
          {
            customerCompanyId: requirement.customerCompanyId,
            attributedCrmId: requirement.attributedCrmId,
            attributedSrmId: submission.attributedSrmId,
            attributedMsmeId:
              body.engagementType === "C2C" ? submission.attributedMsmeId : null,
            candidateId: submission.candidateId,
            interviewerIds: Array.from(
              new Set(interviewerFees.map((f) => f.interviewerUserId)),
            ),
          },
          ruleDrafts.map((r) => ({
            slot: r.slot,
            beneficiaryUserId: r.beneficiaryUserId,
            beneficiaryMsmeId: r.beneficiaryMsmeId,
            calculation: r.calculation,
            percentOfBillRate: r.percentOfBillRate
              ? new PrismaDecimal(r.percentOfBillRate.toFixed(4))
              : null,
            flatFeeUsd: r.flatFeeUsd
              ? new PrismaDecimal(r.flatFeeUsd.toFixed(2))
              : null,
            interviewId: r.interviewId,
            notes: r.notes,
          })),
          {
            id: eventId,
            eventType: "placement.created.v1",
            aggregateId: placementId,
            payload: outboxPayload as unknown as Prisma.InputJsonValue,
          },
          tx,
        );
      });

      const viewer = resolveViewerRole(ctx, result.placement.createdByUserId, result.valueChain);
      const filteredChain = filterValueChain(result.valueChain, viewer);
      const filteredRules = filterCommissionRules(result.rules, viewer);
      const billRateNum = Number(
        result.placement.billRateUsd instanceof PrismaDecimal
          ? result.placement.billRateUsd.toFixed(2)
          : result.placement.billRateUsd,
      );

      return {
        placement: toPlacementResponse(result.placement),
        valueChain: toValueChainResponse(filteredChain),
        rules: {
          data: filteredRules.map((r) =>
            toCommissionRuleResponse(r, billRateNum, result.rules),
          ),
        },
      };
    },

    async getPlacement(ctx: AuthContext, id: string): Promise<PlacementResponse> {
      const { placement } = await placementRepository.findById(ctx, id);
      return toPlacementResponse(placement);
    },

    async getValueChain(ctx: AuthContext, id: string): Promise<ValueChainResponse> {
      const { placement, valueChain } = await placementRepository.findById(ctx, id);
      if (!valueChain) throw new NotFoundError("Value chain not found");
      const viewer = resolveViewerRole(ctx, placement.createdByUserId, valueChain);
      return toValueChainResponse(filterValueChain(valueChain, viewer));
    },

    async getCommissionRules(
      ctx: AuthContext,
      id: string,
    ): Promise<CommissionRuleListResponse> {
      const { placement, valueChain } = await placementRepository.findById(ctx, id);
      if (!valueChain) throw new NotFoundError("Value chain not found");
      const viewer = resolveViewerRole(ctx, placement.createdByUserId, valueChain);
      const allRules = await commissionRuleRepository.findByPlacement(id);
      const filtered = filterCommissionRules(allRules, viewer);
      const billRateNum = Number(
        placement.billRateUsd instanceof PrismaDecimal
          ? placement.billRateUsd.toFixed(2)
          : placement.billRateUsd,
      );
      return {
        data: filtered.map((r) => toCommissionRuleResponse(r, billRateNum, allRules)),
      };
    },

    async listPlacements(
      ctx: AuthContext,
      filters: PlacementFilter,
    ): Promise<PlacementListResponse> {
      const { limit, cursor, ...rest } = filters;
      const result = await placementRepository.list(ctx, rest, cursor ?? null, limit);
      return {
        data: result.data.map(toPlacementResponse),
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      };
    },

    async endPlacement(
      ctx: AuthContext,
      id: string,
      body: EndPlacement,
    ): Promise<PlacementResponse> {
      const actualEndDate = body.actualEndDate
        ? new Date(body.actualEndDate)
        : new Date();

      const updated = await prisma.$transaction(async (tx) => {
        const row = await placementRepository.endPlacement(
          ctx,
          id,
          body.status,
          actualEndDate,
          body.reason,
          tx,
        );

        await tx.outgoingEvent.create({
          data: {
            eventType: "placement.ended.v1",
            aggregateId: id,
            payload: {
              eventId: randomUUID(),
              type: "placement.ended.v1",
              version: 1,
              occurredAt: new Date().toISOString(),
              payload: {
                placementId: id,
                status: body.status,
                actualEndDate: actualEndDate.toISOString(),
                endReason: body.reason,
                endedAt: new Date().toISOString(),
              },
            },
            status: "PENDING",
            attempts: 0,
          },
        });

        return row;
      });

      return toPlacementResponse(updated);
    },
  };
}

export type PlacementService = ReturnType<typeof createPlacementService>;
