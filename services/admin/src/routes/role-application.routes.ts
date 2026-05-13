import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  ApproveApplicationSchema,
  RejectApplicationSchema,
  RoleApplicationFilterSchema,
  RoleApplicationRequestSchema,
} from "@techorbit/types";
import type { RoleApplicationService } from "../services/role-application.service.js";

const IdParams = z.object({ id: z.string().uuid() });

export async function roleApplicationRoutes(
  fastify: FastifyInstance,
  options: { roleApplicationService: RoleApplicationService },
): Promise<void> {
  const { roleApplicationService } = options;

  fastify.post(
    "/api/v1/role-applications",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = RoleApplicationRequestSchema.parse(request.body);
      const result = await roleApplicationService.submit(request.auth, body);
      return reply.status(201).send(result);
    },
  );

  fastify.get(
    "/api/v1/role-applications",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const filter = RoleApplicationFilterSchema.parse(request.query);
      const result = await roleApplicationService.list(request.auth, filter);
      return reply.status(200).send(result);
    },
  );

  fastify.get(
    "/api/v1/role-applications/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const result = await roleApplicationService.get(request.auth, id);
      return reply.status(200).send(result);
    },
  );

  fastify.post(
    "/api/v1/role-applications/:id/approve",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const body = ApproveApplicationSchema.parse(request.body ?? {});
      const result = await roleApplicationService.approve(request.auth, id, body);
      return reply.status(200).send(result);
    },
  );

  fastify.post(
    "/api/v1/role-applications/:id/reject",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const body = RejectApplicationSchema.parse(request.body);
      const result = await roleApplicationService.reject(request.auth, id, body);
      return reply.status(200).send(result);
    },
  );
}
