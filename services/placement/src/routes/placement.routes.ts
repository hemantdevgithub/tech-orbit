import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  CreatePlacementRequestSchema,
  EndPlacementSchema,
  PlacementFilterSchema,
} from "@techorbit/types";
import type { PlacementService } from "../services/placement.service.js";

const IdParams = z.object({ id: z.string().uuid() });

export async function placementRoutes(
  fastify: FastifyInstance,
  options: { placementService: PlacementService },
): Promise<void> {
  const { placementService } = options;

  // POST /api/v1/placements
  fastify.post(
    "/api/v1/placements",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = CreatePlacementRequestSchema.parse(request.body);
      const result = await placementService.createPlacement(request.auth, body);
      return reply.status(201).send(result);
    },
  );

  // GET /api/v1/placements
  fastify.get(
    "/api/v1/placements",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const filters = PlacementFilterSchema.parse(request.query);
      const result = await placementService.listPlacements(request.auth, filters);
      return reply.status(200).send(result);
    },
  );

  // GET /api/v1/placements/:id
  fastify.get(
    "/api/v1/placements/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const result = await placementService.getPlacement(request.auth, id);
      return reply.status(200).send(result);
    },
  );

  // GET /api/v1/placements/:id/value-chain
  fastify.get(
    "/api/v1/placements/:id/value-chain",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const result = await placementService.getValueChain(request.auth, id);
      return reply.status(200).send(result);
    },
  );

  // GET /api/v1/placements/:id/commissions
  fastify.get(
    "/api/v1/placements/:id/commissions",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const result = await placementService.getCommissionRules(request.auth, id);
      return reply.status(200).send(result);
    },
  );

  // POST /api/v1/placements/:id/end
  fastify.post(
    "/api/v1/placements/:id/end",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const body = EndPlacementSchema.parse(request.body);
      const result = await placementService.endPlacement(request.auth, id, body);
      return reply.status(200).send(result);
    },
  );
}
