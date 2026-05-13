import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  CreateThreadRequestSchema,
  SendMessageRequestSchema,
  ThreadFilterSchema,
} from "@techorbit/types";
import type { MessagingService } from "../services/messaging.service.js";

const IdParams = z.object({ id: z.string().uuid() });

export async function messagingRoutes(
  fastify: FastifyInstance,
  options: { messagingService: MessagingService },
): Promise<void> {
  const { messagingService } = options;

  fastify.post(
    "/api/v1/threads",
    {
      preHandler: [fastify.authenticate],
      // Anti-spam: cap new-thread creation per user. 20 new threads per hour
      // is generous for legitimate use.
      config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const body = CreateThreadRequestSchema.parse(request.body);
      const result = await messagingService.createThread(request.auth, body);
      return reply.status(201).send(result);
    },
  );

  fastify.get(
    "/api/v1/threads",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const filter = ThreadFilterSchema.parse(request.query);
      const result = await messagingService.listThreads(request.auth, filter);
      return reply.status(200).send(result);
    },
  );

  fastify.get(
    "/api/v1/threads/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const result = await messagingService.getThread(request.auth, id);
      return reply.status(200).send(result);
    },
  );

  fastify.post(
    "/api/v1/threads/:id/messages",
    {
      preHandler: [fastify.authenticate],
      // Cap per-user message volume. 100/min handles even aggressive chat;
      // anything beyond that is almost certainly abuse.
      config: { rateLimit: { max: 100, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const body = SendMessageRequestSchema.parse(request.body);
      const result = await messagingService.sendMessage(request.auth, id, body);
      return reply.status(201).send(result);
    },
  );

  fastify.post(
    "/api/v1/threads/:id/mark-read",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const result = await messagingService.markRead(request.auth, id);
      return reply.status(200).send(result);
    },
  );
}
