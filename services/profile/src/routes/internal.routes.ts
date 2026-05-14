import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireServiceRole } from "@techorbit/auth-middleware";
import { Decimal } from "@prisma/client/runtime/library";
import { candidateRepository } from "../repositories/candidate.repository.js";
import { customerRepository } from "../repositories/customer.repository.js";
import { srmPortfolioRepository } from "../repositories/srm-portfolio.repository.js";

// Service-to-service routes.  Verified via the shared JWT public key and
// gated on roles=["SERVICE"].  Never call these from a browser — no CORS
// exposure, no user-level authz.

const listQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export async function internalRoutes(fastify: FastifyInstance): Promise<void> {
  const gate = requireServiceRole(fastify);

  // GET /api/v1/internal/candidates — paginated list of complete candidate
  // profiles, used by matching-svc to precompute MatchingSignal rows.
  fastify.get(
    "/api/v1/internal/candidates",
    { preHandler: [gate] },
    async (request, reply) => {
      const { cursor, limit } = listQuerySchema.parse(request.query);
      const result = await candidateRepository.listComplete(cursor ?? null, limit);
      return reply.status(200).send({
        data: result.data.map((p) => ({
          id: p.id,
          userId: p.userId,
          seniority: p.seniority,
          skills: p.skills,
          location: p.location,
          preferRemote: p.preferRemote,
          preferHybrid: p.preferHybrid,
          preferOnsite: p.preferOnsite,
          workAuthStatus: p.workAuthStatus,
          averageRating:
            p.averageRating instanceof Decimal
              ? Number(p.averageRating.toFixed(2))
              : p.averageRating === null
                ? null
                : Number(p.averageRating),
          isProfileComplete: p.isProfileComplete,
        })),
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      });
    },
  );

  // GET /api/v1/internal/customers/:userId — same shape as /api/v1/customers/:userId
  // but skips user-level authz.  matching-svc uses this to resolve a submission
  // submitter's company (future: commission attribution).  Kept minimal for now.
  fastify.get(
    "/api/v1/internal/customers/:userId",
    { preHandler: [gate] },
    async (request, reply) => {
      const { userId } = z.object({ userId: z.string().uuid() }).parse(request.params);
      const company = await customerRepository.findByPrimaryUserId(userId);
      if (!company) return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Customer company not found" },
      });
      return reply.status(200).send({
        id: company.id,
        primaryUserId: company.primaryUserId,
        attributedCrmUserId: company.attributedCrmUserId,
        isProfileComplete: company.isProfileComplete,
      });
    },
  );

  // Sprint 12 — S2S check for matching-svc: does the SRM have an APPROVED
  // portfolio link with this candidate / MSME? Used to gate invite-to-submit.
  fastify.get(
    "/api/v1/internal/srm-portfolio/has-approved-link",
    { preHandler: [gate] },
    async (request, reply) => {
      const query = z
        .object({
          srmUserId: z.string().uuid(),
          memberUserId: z.string().uuid(),
          memberType: z.enum(["CANDIDATE", "MSME"]),
        })
        .parse(request.query);
      const hasLink = await srmPortfolioRepository.hasApprovedLink(
        query.srmUserId,
        query.memberUserId,
        query.memberType,
      );
      return reply.status(200).send({ hasLink });
    },
  );
}
