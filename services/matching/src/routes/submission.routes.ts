import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  SubmissionFilterSchema,
  SubmissionRequestSchema,
  UpdateSubmissionStatusSchema,
  WithdrawSubmissionSchema,
} from "@techorbit/types";
import type { SubmissionService } from "../services/submission.service.js";

const IdParams = z.object({ id: z.string().uuid() });
const ReqIdParams = z.object({ reqId: z.string().uuid() });
const MatchesQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

function getBearerToken(request: FastifyRequest): string {
  const header = request.headers.authorization ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

export async function submissionRoutes(
  fastify: FastifyInstance,
  options: { submissionService: SubmissionService },
): Promise<void> {
  const { submissionService } = options;

  fastify.post(
    "/api/v1/submissions",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = SubmissionRequestSchema.parse(request.body);
      const response = await submissionService.createSubmission(
        request.auth,
        body,
        getBearerToken(request),
      );
      return reply.status(201).send(response);
    },
  );

  fastify.get(
    "/api/v1/submissions",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const filters = SubmissionFilterSchema.parse(request.query);
      const response = await submissionService.listSubmissions(
        request.auth,
        filters,
      );
      return reply.status(200).send(response);
    },
  );

  fastify.get(
    "/api/v1/submissions/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const response = await submissionService.getSubmission(request.auth, id);
      return reply.status(200).send(response);
    },
  );

  fastify.patch(
    "/api/v1/submissions/:id/status",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const body = UpdateSubmissionStatusSchema.parse(request.body);
      const response = await submissionService.updateSubmissionStatus(
        request.auth,
        id,
        body,
      );
      return reply.status(200).send(response);
    },
  );

  fastify.post(
    "/api/v1/submissions/:id/withdraw",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const body = WithdrawSubmissionSchema.parse(request.body);
      const response = await submissionService.withdrawSubmission(
        request.auth,
        id,
        body,
      );
      return reply.status(200).send(response);
    },
  );

  fastify.get(
    "/api/v1/matches/for-requirement/:reqId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { reqId } = ReqIdParams.parse(request.params);
      const { limit } = MatchesQuery.parse(request.query);
      const data = await submissionService.listMatchesForRequirement(
        request.auth,
        reqId,
        limit,
      );
      return reply.status(200).send({ data });
    },
  );
}
