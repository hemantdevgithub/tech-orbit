import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { CreateMsmeProfileSchema, UpdateMsmeProfileSchema, AddBenchEntrySchema } from "@techorbit/types";
import type { MsmeService } from "../services/msme.service.js";

export async function msmeRoutes(
  fastify: FastifyInstance,
  options: { msmeService: MsmeService },
): Promise<void> {
  const { msmeService } = options;

  // GET /api/v1/msme/me
  fastify.get(
    "/api/v1/msme/me",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const profile = await msmeService.getProfile(request.auth, request.auth.userId);
      return reply.status(200).send(profile);
    },
  );

  // POST /api/v1/msme/me
  fastify.post(
    "/api/v1/msme/me",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = CreateMsmeProfileSchema.parse(request.body);
      const profile = await msmeService.createProfile(request.auth, request.auth.userId, body);
      return reply.status(201).send(profile);
    },
  );

  // PATCH /api/v1/msme/me
  fastify.patch(
    "/api/v1/msme/me",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = UpdateMsmeProfileSchema.parse(request.body);
      const profile = await msmeService.updateProfile(request.auth, request.auth.userId, body);
      return reply.status(200).send(profile);
    },
  );

  // GET /api/v1/msme/:ownerUserId  (admin/CRM view)
  fastify.get(
    "/api/v1/msme/:ownerUserId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { ownerUserId } = z.object({ ownerUserId: z.string().uuid() }).parse(request.params);
      const profile = await msmeService.getProfile(request.auth, ownerUserId);
      return reply.status(200).send(profile);
    },
  );

  // GET /api/v1/msme/me/bench
  fastify.get(
    "/api/v1/msme/me/bench",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const entries = await msmeService.getBenchEntries(request.auth, request.auth.userId);
      return reply.status(200).send({ data: entries });
    },
  );

  // POST /api/v1/msme/me/bench
  fastify.post(
    "/api/v1/msme/me/bench",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = AddBenchEntrySchema.parse(request.body);
      const entry = await msmeService.addBenchEntry(request.auth, request.auth.userId, body);
      return reply.status(201).send(entry);
    },
  );

  // DELETE /api/v1/msme/me/bench/:entryId
  fastify.delete(
    "/api/v1/msme/me/bench/:entryId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { entryId } = z.object({ entryId: z.string().uuid() }).parse(request.params);
      await msmeService.removeBenchEntry(request.auth, request.auth.userId, entryId);
      return reply.status(204).send();
    },
  );
}
