import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  AddDisputeNoteSchema,
  CreateDisputeRequestSchema,
  DisputeFilterSchema,
  ResolveDisputeSchema,
} from "@techorbit/types";
import type { DisputeService } from "../services/dispute.service.js";

const IdParams = z.object({ id: z.string().uuid() });

export async function disputeRoutes(
  fastify: FastifyInstance,
  options: { disputeService: DisputeService },
): Promise<void> {
  const { disputeService } = options;

  fastify.post(
    "/api/v1/disputes",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = CreateDisputeRequestSchema.parse(request.body);
      const result = await disputeService.create(request.auth, body);
      return reply.status(201).send(result);
    },
  );

  fastify.get(
    "/api/v1/disputes",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const filter = DisputeFilterSchema.parse(request.query);
      const result = await disputeService.list(request.auth, filter);
      return reply.status(200).send(result);
    },
  );

  fastify.get(
    "/api/v1/disputes/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const result = await disputeService.get(request.auth, id);
      return reply.status(200).send(result);
    },
  );

  fastify.post(
    "/api/v1/disputes/:id/notes",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const body = AddDisputeNoteSchema.parse(request.body);
      const result = await disputeService.addNote(request.auth, id, body);
      return reply.status(201).send(result);
    },
  );

  fastify.post(
    "/api/v1/disputes/:id/resolve",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const body = ResolveDisputeSchema.parse(request.body);
      const result = await disputeService.resolve(request.auth, id, body);
      return reply.status(200).send(result);
    },
  );
}
