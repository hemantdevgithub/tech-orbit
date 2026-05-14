import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireServiceRole } from "@techorbit/auth-middleware";
import { NotFoundError } from "@techorbit/errors";
import { requirementRepository } from "../repositories/requirement.repository.js";

const IdParams = z.object({ id: z.string().uuid() });

// Service-to-service routes.  Gated on roles=["SERVICE"].  Skips the
// blind-posting redaction and the DRAFT visibility filter — the caller
// (matching-svc) needs full requirement detail to compute scores.
export async function internalRequirementRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  const gate = requireServiceRole(fastify);

  fastify.get(
    "/api/v1/internal/requirements/:id",
    { preHandler: [gate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      // Sprint 12 — include crmOwners so placement-svc can split the CRM
      // commission slot across co-owners.
      const req = await requirementRepository.findByIdWithOwners(id);
      if (!req) throw new NotFoundError("Requirement not found");
      return reply.status(200).send({
        id: req.id,
        customerCompanyId: req.customerCompanyId,
        createdByUserId: req.createdByUserId,
        attributedCrmId: req.attributedCrmId,
        assignedSrmId: req.assignedSrmId,
        crmOwners: req.crmOwners.map((o) => ({
          crmUserId: o.crmUserId,
          isPrimary: o.isPrimary,
          commissionShare: Number(o.commissionShare),
          acceptedAt: o.acceptedAt.toISOString(),
        })),
        title: req.title,
        description: req.description,
        techStack: req.techStack,
        seniority: req.seniority,
        locationType: req.locationType,
        locationCity: req.locationCity,
        locationState: req.locationState,
        billRateMinUsd: Number(req.billRateMinUsd),
        billRateMaxUsd: Number(req.billRateMaxUsd),
        durationWeeks: req.durationWeeks,
        startDate: req.startDate.toISOString(),
        openings: req.openings,
        workAuthPrefs: req.workAuthPrefs,
        requiredInterviews: req.requiredInterviews,
        blindPosting: req.blindPosting,
        status: req.status,
        publishedAt: req.publishedAt?.toISOString() ?? null,
        closedAt: req.closedAt?.toISOString() ?? null,
        closedReason: req.closedReason,
        createdAt: req.createdAt.toISOString(),
        updatedAt: req.updatedAt.toISOString(),
      });
    },
  );
}
