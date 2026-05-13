import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  CloseRequirementSchema,
  CreateRequirementSchema,
  RequirementFilterSchema,
  UpdateRequirementSchema,
} from "@techorbit/types";
import type { RequirementService } from "../services/requirement.service.js";

const IdParams = z.object({ id: z.string().uuid() });

function getBearerToken(request: FastifyRequest): string {
  const header = request.headers.authorization ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

export async function requirementRoutes(
  fastify: FastifyInstance,
  options: { requirementService: RequirementService },
): Promise<void> {
  const { requirementService } = options;

  // POST /api/v1/requirements — create draft
  fastify.post(
    "/api/v1/requirements",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = CreateRequirementSchema.parse(request.body);
      const response = await requirementService.createRequirement(
        request.auth,
        body,
        getBearerToken(request),
      );
      return reply.status(201).send(response);
    },
  );

  // GET /api/v1/requirements — browse with filters
  fastify.get(
    "/api/v1/requirements",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const filters = RequirementFilterSchema.parse(request.query);
      const response = await requirementService.listRequirements(
        request.auth,
        filters,
      );
      return reply.status(200).send(response);
    },
  );

  // GET /api/v1/requirements/:id — get single (visibility enforced)
  fastify.get(
    "/api/v1/requirements/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const response = await requirementService.getRequirement(request.auth, id);
      return reply.status(200).send(response);
    },
  );

  // PATCH /api/v1/requirements/:id — update draft
  fastify.patch(
    "/api/v1/requirements/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const body = UpdateRequirementSchema.parse(request.body);
      const response = await requirementService.updateRequirement(
        request.auth,
        id,
        body,
      );
      return reply.status(200).send(response);
    },
  );

  // POST /api/v1/requirements/:id/publish
  fastify.post(
    "/api/v1/requirements/:id/publish",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const response = await requirementService.publishRequirement(
        request.auth,
        id,
      );
      return reply.status(200).send(response);
    },
  );

  // POST /api/v1/requirements/:id/close
  fastify.post(
    "/api/v1/requirements/:id/close",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const body = CloseRequirementSchema.parse(request.body);
      const response = await requirementService.closeRequirement(
        request.auth,
        id,
        body,
      );
      return reply.status(200).send(response);
    },
  );
}
