import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@techorbit/errors";
import type { AuthContext } from "@techorbit/auth-middleware";
import type {
  RaterRole,
  RatingFilter,
  RatingListResponse,
  RatingResponse,
  SubmitRatingRequest,
} from "@techorbit/types";
import type { Rating } from "../generated/client/index.js";
import { prisma } from "../lib/prisma.js";
import { buildEvent, enqueueEvent } from "../lib/outbox.js";
import type { PlacementApi } from "../lib/placement-api.js";
import {
  aggregatesForUser,
  createRating,
  findByPlacementAndRater,
  listByPlacement,
  listByUser,
} from "../repositories/rating.repository.js";

function toResponse(r: Rating): RatingResponse {
  return {
    id: r.id,
    placementId: r.placementId,
    ratedUserId: r.ratedUserId,
    raterUserId: r.raterUserId,
    raterRole: r.raterRole,
    overallScore: r.overallScore,
    technicalScore: r.technicalScore,
    communicationScore: r.communicationScore,
    professionalismScore: r.professionalismScore,
    feedback: r.feedback,
    createdAt: r.createdAt.toISOString(),
  };
}

export type RatingServiceDeps = {
  placementApi: PlacementApi;
};

export type RatingService = ReturnType<typeof createRatingService>;

export function createRatingService(deps: RatingServiceDeps) {
  return {
    async submit(
      auth: AuthContext,
      body: SubmitRatingRequest,
    ): Promise<RatingResponse> {
      if (auth.userId === body.ratedUserId) {
        throw new ValidationError("You cannot rate yourself");
      }

      const placement = await deps.placementApi.getPlacement(body.placementId);
      if (!placement) throw new NotFoundError("Placement not found");

      // Only participants: creator (customer user) or candidate on the placement.
      let raterRole: RaterRole;
      if (placement.createdByUserId === auth.userId) {
        raterRole = "CUSTOMER";
        if (placement.candidateId !== body.ratedUserId) {
          throw new ValidationError("Customer can only rate the candidate on this placement");
        }
      } else if (placement.candidateId === auth.userId) {
        raterRole = "CANDIDATE";
        if (placement.createdByUserId !== body.ratedUserId) {
          throw new ValidationError("Candidate can only rate the customer on this placement");
        }
      } else {
        throw new ForbiddenError("Only the customer or candidate on the placement can rate");
      }

      if (placement.status !== "ENDED_COMPLETED") {
        throw new ValidationError("Ratings are allowed only after the placement ends cleanly");
      }

      const existing = await findByPlacementAndRater(body.placementId, auth.userId);
      if (existing) throw new ConflictError("You have already rated this placement");

      const saved = await prisma.$transaction(async (tx) => {
        const row = await createRating(tx, {
          placementId: body.placementId,
          ratedUserId: body.ratedUserId,
          raterUserId: auth.userId,
          raterRole,
          overallScore: body.overallScore,
          technicalScore: body.technicalScore ?? null,
          communicationScore: body.communicationScore ?? null,
          professionalismScore: body.professionalismScore ?? null,
          feedback: body.feedback ?? null,
        });
        const event = buildEvent("rating.submitted.v1", {
          ratingId: row.id,
          placementId: row.placementId,
          ratedUserId: row.ratedUserId,
          raterUserId: row.raterUserId,
          raterRole: row.raterRole,
          overallScore: row.overallScore,
        });
        await enqueueEvent(tx, event, row.id);
        return row;
      });

      return toResponse(saved);
    },

    async list(filter: RatingFilter): Promise<RatingListResponse> {
      if (!filter.userId && !filter.placementId) {
        throw new ValidationError("userId or placementId is required");
      }
      let rows: Rating[];
      if (filter.userId) {
        rows = await listByUser(filter.userId, filter.limit);
      } else {
        rows = await listByPlacement(filter.placementId!, filter.limit);
      }
      const aggregates = filter.userId
        ? await aggregatesForUser(filter.userId)
        : {
            averageOverall: null,
            averageTechnical: null,
            averageCommunication: null,
            averageProfessionalism: null,
            totalCount: rows.length,
          };
      return {
        data: rows.map(toResponse),
        averageOverall: aggregates.averageOverall,
        averageTechnical: aggregates.averageTechnical,
        averageCommunication: aggregates.averageCommunication,
        averageProfessionalism: aggregates.averageProfessionalism,
        totalCount: aggregates.totalCount,
      };
    },
  };
}
