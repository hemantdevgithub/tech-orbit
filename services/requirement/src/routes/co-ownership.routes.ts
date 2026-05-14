import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AssignSrmSchema } from "@techorbit/types";
import type { RequirementService } from "../services/requirement.service.js";

const IdParams = z.object({ id: z.string().uuid() });

// Sprint 12 — co-ownership accept/release + SRM assignment routes.
//
// These run alongside the legacy CRM-attribution routes (claim → customer
// approve → attributed) which still serve the single-attribution model. The
// new Opportunity Portal calls these directly; multiple CRMs can co-own.
export async function coOwnershipRoutes(
  fastify: FastifyInstance,
  options: { requirementService: RequirementService },
): Promise<void> {
  const { requirementService } = options;

  // POST /api/v1/requirements/:id/accept — CRM accepts (becomes co-owner)
  fastify.post(
    "/api/v1/requirements/:id/accept",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const response = await requirementService.acceptByCrm(request.auth, id);
      return reply.status(200).send(response);
    },
  );

  // POST /api/v1/requirements/:id/release — co-owning CRM steps away
  fastify.post(
    "/api/v1/requirements/:id/release",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const response = await requirementService.releaseByCrm(request.auth, id);
      return reply.status(200).send(response);
    },
  );

  // POST /api/v1/requirements/:id/assign-srm — co-owning CRM picks an SRM
  fastify.post(
    "/api/v1/requirements/:id/assign-srm",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const body = AssignSrmSchema.parse(request.body);
      const response = await requirementService.assignSrm(request.auth, id, body);
      return reply.status(200).send(response);
    },
  );

  // POST /api/v1/requirements/:id/unassign-srm — clear the SRM
  fastify.post(
    "/api/v1/requirements/:id/unassign-srm",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const response = await requirementService.unassignSrm(request.auth, id);
      return reply.status(200).send(response);
    },
  );
}
