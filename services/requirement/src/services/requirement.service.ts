import type {
  CloseRequirement,
  CreateRequirement,
  RequirementFilter,
  RequirementListResponse,
  RequirementResponse,
  UpdateRequirement,
} from "@techorbit/types";
import type { AuthContext } from "@techorbit/auth-middleware";
import { ForbiddenError, NotFoundError, ValidationError } from "@techorbit/errors";
import { prisma } from "../lib/prisma.js";
import {
  requirementRepository,
} from "../repositories/requirement.repository.js";
import {
  toRequirementResponse,
} from "../lib/response-mappers.js";
import { getCustomerCompanyByUser } from "../lib/profile-api.js";
import { buildEvent, enqueueEvent } from "../lib/outbox.js";
import type { Config } from "../config.js";

function requireCustomerRole(ctx: AuthContext): void {
  if (!ctx.roles.includes("CUSTOMER") && !ctx.roles.includes("ADMIN")) {
    throw new ForbiddenError("Only customers can perform this action");
  }
}

export function createRequirementService(config: Config) {
  return {
    async createRequirement(
      ctx: AuthContext,
      body: CreateRequirement,
      bearerToken: string,
    ): Promise<RequirementResponse> {
      requireCustomerRole(ctx);

      // Fetch the caller's CustomerCompanyProfile to get the canonical
      // CustomerCompanyProfile.id (not User.id) for the FK.
      const customer = await getCustomerCompanyByUser(
        config.PROFILE_SVC_URL,
        ctx.userId,
        bearerToken,
      );
      if (!customer) {
        throw new ValidationError(
          "Cannot post a requirement without a customer company profile. Complete onboarding first.",
        );
      }

      const created = await requirementRepository.create({
        customerCompanyId: customer.id,
        createdByUserId: ctx.userId,
        attributedCrmId: customer.attributedCrmUserId,
        title: body.title,
        description: body.description,
        techStack: body.techStack,
        seniority: body.seniority,
        locationType: body.locationType,
        locationCity: body.locationCity ?? null,
        locationState: body.locationState ?? null,
        billRateMinUsd: body.billRateMinUsd,
        billRateMaxUsd: body.billRateMaxUsd,
        durationWeeks: body.durationWeeks,
        startDate: new Date(body.startDate),
        openings: body.openings,
        workAuthPrefs: body.workAuthPrefs,
        requiredInterviews: body.requiredInterviews,
        blindPosting: body.blindPosting,
      });

      return toRequirementResponse(ctx, created);
    },

    async getRequirement(
      ctx: AuthContext,
      id: string,
    ): Promise<RequirementResponse> {
      const req = await requirementRepository.findById(ctx, id);
      return toRequirementResponse(ctx, req);
    },

    async updateRequirement(
      ctx: AuthContext,
      id: string,
      body: UpdateRequirement,
    ): Promise<RequirementResponse> {
      const updated = await requirementRepository.update(ctx, id, {
        title: body.title,
        description: body.description,
        techStack: body.techStack,
        seniority: body.seniority,
        locationType: body.locationType,
        locationCity: body.locationCity,
        locationState: body.locationState,
        billRateMinUsd: body.billRateMinUsd,
        billRateMaxUsd: body.billRateMaxUsd,
        durationWeeks: body.durationWeeks,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        openings: body.openings,
        workAuthPrefs: body.workAuthPrefs,
        requiredInterviews: body.requiredInterviews,
        blindPosting: body.blindPosting,
      });
      return toRequirementResponse(ctx, updated);
    },

    async publishRequirement(
      ctx: AuthContext,
      id: string,
    ): Promise<RequirementResponse> {
      const draft = await requirementRepository.findByIdRaw(id);
      if (!draft) throw new NotFoundError("Requirement not found");

      // Pre-publish validation per Task 4: openings >= 1, rates coherent,
      // start date in the future (or today).
      if (draft.openings < 1) {
        throw new ValidationError("Requirement must have at least 1 opening");
      }
      if (Number(draft.billRateMaxUsd) < Number(draft.billRateMinUsd)) {
        throw new ValidationError(
          "billRateMaxUsd must be >= billRateMinUsd",
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const published = await requirementRepository.publish(ctx, id, tx);
        const event = buildEvent("requirement.published.v1", {
          requirementId: published.id,
          customerCompanyId: published.customerCompanyId,
          attributedCrmId: published.attributedCrmId,
          techStack: published.techStack,
          seniority: published.seniority,
          locationType: published.locationType,
          publishedAt: published.publishedAt!.toISOString(),
        });
        await enqueueEvent(tx, event, published.id);
        return published;
      });

      return toRequirementResponse(ctx, updated);
    },

    async closeRequirement(
      ctx: AuthContext,
      id: string,
      body: CloseRequirement,
    ): Promise<RequirementResponse> {
      const updated = await prisma.$transaction(async (tx) => {
        const closed = await requirementRepository.close(ctx, id, body.reason, tx);
        const event = buildEvent("requirement.closed.v1", {
          requirementId: closed.id,
          reason: body.reason,
          closedAt: closed.closedAt!.toISOString(),
        });
        await enqueueEvent(tx, event, closed.id);
        return closed;
      });

      return toRequirementResponse(ctx, updated);
    },

    async listRequirements(
      ctx: AuthContext,
      filters: RequirementFilter,
    ): Promise<RequirementListResponse> {
      const { limit, cursor, ...rest } = filters;
      const result = await requirementRepository.list(ctx, {
        filters: rest,
        cursor,
        limit,
      });
      return {
        data: result.data.map((req) => toRequirementResponse(ctx, req)),
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      };
    },
  };
}

export type RequirementService = ReturnType<typeof createRequirementService>;
