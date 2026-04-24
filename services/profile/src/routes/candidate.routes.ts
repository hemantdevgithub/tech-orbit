import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  SetFeaturedInterviewsSchema,
  UpdateCandidateProfileSchema,
} from "@techorbit/types";
import type { CandidateService } from "../services/candidate.service.js";

type Options = { candidateService: CandidateService };

export async function candidateRoutes(
  fastify: FastifyInstance,
  options: Options,
): Promise<void> {
  const { candidateService } = options;

  // GET /api/v1/candidates/me
  fastify.get(
    "/api/v1/candidates/me",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const profile = await candidateService.getProfile(request.auth, request.auth.userId);
      return reply.status(200).send(profile);
    },
  );

  // PATCH /api/v1/candidates/me
  fastify.patch(
    "/api/v1/candidates/me",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = UpdateCandidateProfileSchema.parse(request.body);
      const profile = await candidateService.updateProfile(request.auth, request.auth.userId, body);
      return reply.status(200).send(profile);
    },
  );

  // PATCH /api/v1/candidates/me/featured-interviews
  fastify.patch(
    "/api/v1/candidates/me/featured-interviews",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = SetFeaturedInterviewsSchema.parse(request.body);
      const profile = await candidateService.setFeaturedInterviews(
        request.auth,
        request.auth.userId,
        body.interviewIds,
      );
      return reply.status(200).send(profile);
    },
  );

  // GET /api/v1/candidates/:userId  (admin/CRM/SRM view — full profile)
  fastify.get(
    "/api/v1/candidates/:userId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { userId } = z.object({ userId: z.string().uuid() }).parse(request.params);
      const profile = await candidateService.getProfile(request.auth, userId);
      return reply.status(200).send(profile);
    },
  );

  // GET /api/v1/candidates/:userId/public  (any authenticated user — no PII)
  fastify.get(
    "/api/v1/candidates/:userId/public",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { userId } = z.object({ userId: z.string().uuid() }).parse(request.params);
      const profile = await candidateService.getPublicProfile(userId);
      return reply.status(200).send(profile);
    },
  );

  // POST /api/v1/candidates/me/resume
  fastify.post(
    "/api/v1/candidates/me/resume",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { fileId } = z.object({ fileId: z.string().uuid() }).parse(request.body);
      const profile = await candidateService.attachResume(request.auth, request.auth.userId, fileId);
      return reply.status(200).send(profile);
    },
  );

  // POST /api/v1/candidates/me/kyc/start
  fastify.post(
    "/api/v1/candidates/me/kyc/start",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const result = await candidateService.startKyc(request.auth, request.auth.userId);
      return reply.status(200).send(result);
    },
  );
}
