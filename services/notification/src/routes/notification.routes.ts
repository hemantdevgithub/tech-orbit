import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  NotificationFilterSchema,
  UpdateNotificationPreferenceSchema,
} from "@techorbit/types";
import type { NotificationService } from "../services/notification.service.js";

const IdParams = z.object({ id: z.string().uuid() });

export async function notificationRoutes(
  fastify: FastifyInstance,
  options: { notificationService: NotificationService },
): Promise<void> {
  const { notificationService } = options;

  fastify.get(
    "/api/v1/notifications",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const filter = NotificationFilterSchema.parse(request.query);
      const result = await notificationService.listForUser(request.auth, filter);
      return reply.status(200).send(result);
    },
  );

  fastify.post(
    "/api/v1/notifications/:id/mark-read",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const result = await notificationService.markRead(request.auth, id);
      return reply.status(200).send(result);
    },
  );

  fastify.post(
    "/api/v1/notifications/mark-all-read",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const result = await notificationService.markAllRead(request.auth);
      return reply.status(200).send(result);
    },
  );

  fastify.get(
    "/api/v1/notification-preferences",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const result = await notificationService.getPreference(request.auth);
      return reply.status(200).send(result);
    },
  );

  fastify.put(
    "/api/v1/notification-preferences",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = UpdateNotificationPreferenceSchema.parse(request.body);
      const result = await notificationService.updatePreference(request.auth, body);
      return reply.status(200).send(result);
    },
  );
}
