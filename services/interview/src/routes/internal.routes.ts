import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireServiceRole } from "@techorbit/auth-middleware";
import { interviewRepository } from "../repositories/interview.repository.js";
import { toInterviewResponse } from "../lib/response-mappers.js";

const SubmissionQuery = z.object({
  submissionId: z.string().uuid(),
  status: z.string().optional(), // optional filter, e.g. "COMPLETED"
});

// Service-to-service routes.  Gated on roles=["SERVICE"].  These skip
// user-level visibility so placement-svc can gather the full Value Chain.
export async function internalInterviewRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  const gate = requireServiceRole(fastify);

  // GET /api/v1/internal/interviews?submissionId=<id>[&status=COMPLETED]
  fastify.get(
    "/api/v1/internal/interviews",
    { preHandler: [gate] },
    async (request, reply) => {
      const { submissionId, status } = SubmissionQuery.parse(request.query);

      const rows = await interviewRepository.findForSubmissionUnfiltered(
        submissionId,
        status,
      );

      return reply.status(200).send({
        data: rows.map(toInterviewResponse),
      });
    },
  );
}
