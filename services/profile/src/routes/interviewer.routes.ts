import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  CreateInterviewerProfileSchema,
  UpdateInterviewerProfileSchema,
  SetAvailabilitySchema,
} from "@techorbit/types";
import { interviewerService } from "../services/interviewer.service.js";

export async function interviewerRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/v1/interviewers — browse active, complete interviewer profiles
  fastify.get(
    "/api/v1/interviewers",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const query = z.object({
        specializations: z.string().optional(),
        cursor: z.string().uuid().optional(),
        limit: z.coerce.number().int().min(1).max(50).default(20),
      }).parse(request.query);
      const result = await interviewerService.listInterviewers({
        specializations: query.specializations ? query.specializations.split(",") : undefined,
        cursor: query.cursor,
        limit: query.limit,
      });
      return reply.status(200).send(result);
    },
  );

  // GET /api/v1/interviewers/me
  fastify.get(
    "/api/v1/interviewers/me",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const profile = await interviewerService.getProfile(request.auth, request.auth.userId);
      return reply.status(200).send(profile);
    },
  );

  // POST /api/v1/interviewers/me
  fastify.post(
    "/api/v1/interviewers/me",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = CreateInterviewerProfileSchema.parse(request.body);
      const profile = await interviewerService.createProfile(request.auth, request.auth.userId, body);
      return reply.status(201).send(profile);
    },
  );

  // PATCH /api/v1/interviewers/me
  fastify.patch(
    "/api/v1/interviewers/me",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = UpdateInterviewerProfileSchema.parse(request.body);
      const profile = await interviewerService.updateProfile(request.auth, request.auth.userId, body);
      return reply.status(200).send(profile);
    },
  );

  // GET /api/v1/interviewers/:userId  (admin/CRM/SRM view — full profile)
  fastify.get(
    "/api/v1/interviewers/:userId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { userId } = z.object({ userId: z.string().uuid() }).parse(request.params);
      const profile = await interviewerService.getProfile(request.auth, userId);
      return reply.status(200).send(profile);
    },
  );

  // GET /api/v1/interviewers/:userId/public  (any authenticated user — no PII)
  fastify.get(
    "/api/v1/interviewers/:userId/public",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { userId } = z.object({ userId: z.string().uuid() }).parse(request.params);
      const profile = await interviewerService.getPublicProfile(userId);
      return reply.status(200).send(profile);
    },
  );

  // PUT /api/v1/interviewers/me/availability
  fastify.put(
    "/api/v1/interviewers/me/availability",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = SetAvailabilitySchema.parse(request.body);
      const profile = await interviewerService.setAvailability(request.auth, request.auth.userId, body);
      return reply.status(200).send(profile);
    },
  );
}
