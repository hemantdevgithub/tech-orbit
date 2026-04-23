import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  CancelInterviewSchema,
  InterviewFilterSchema,
  ScheduleInterviewRequestSchema,
  ScorecardRequestSchema,
} from "@techorbit/types";
import type { InterviewService } from "../services/interview.service.js";

const IdParams = z.object({ id: z.string().uuid() });

export async function interviewRoutes(
  fastify: FastifyInstance,
  options: { interviewService: InterviewService },
): Promise<void> {
  const { interviewService } = options;

  // POST /api/v1/interviews
  fastify.post(
    "/api/v1/interviews",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = ScheduleInterviewRequestSchema.parse(request.body);
      const result = await interviewService.scheduleInterview(request.auth, body);
      return reply.status(201).send(result);
    },
  );

  // GET /api/v1/interviews
  fastify.get(
    "/api/v1/interviews",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const filters = InterviewFilterSchema.parse(request.query);
      const result = await interviewService.listInterviews(request.auth, filters);
      return reply.status(200).send(result);
    },
  );

  // GET /api/v1/interviews/:id
  fastify.get(
    "/api/v1/interviews/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const result = await interviewService.getInterview(request.auth, id);
      return reply.status(200).send(result);
    },
  );

  // POST /api/v1/interviews/:id/start
  fastify.post(
    "/api/v1/interviews/:id/start",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const result = await interviewService.startInterview(request.auth, id);
      return reply.status(200).send(result);
    },
  );

  // POST /api/v1/interviews/:id/end
  fastify.post(
    "/api/v1/interviews/:id/end",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const result = await interviewService.endInterview(request.auth, id);
      return reply.status(200).send(result);
    },
  );

  // POST /api/v1/interviews/:id/cancel
  fastify.post(
    "/api/v1/interviews/:id/cancel",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const body = CancelInterviewSchema.parse(request.body);
      const result = await interviewService.cancelInterview(request.auth, id, body);
      return reply.status(200).send(result);
    },
  );

  // POST /api/v1/scorecards
  fastify.post(
    "/api/v1/scorecards",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = ScorecardRequestSchema.parse(request.body);
      const result = await interviewService.submitScorecard(request.auth, body);
      return reply.status(201).send(result);
    },
  );

  // GET /api/v1/scorecards?interviewId=
  fastify.get(
    "/api/v1/scorecards",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { interviewId } = z
        .object({ interviewId: z.string().uuid() })
        .parse(request.query);
      const result = await interviewService.getScorecard(request.auth, interviewId);
      if (!result) return reply.status(404).send({ error: { code: "NOT_FOUND", message: "Scorecard not found" } });
      return reply.status(200).send(result);
    },
  );
}
