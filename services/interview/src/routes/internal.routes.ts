import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireServiceRole } from "@techorbit/auth-middleware";
import { interviewRepository } from "../repositories/interview.repository.js";
import { toInterviewResponse } from "../lib/response-mappers.js";

const SubmissionQuery = z.object({
  submissionId: z.string().uuid(),
  status: z.string().optional(), // optional filter, e.g. "COMPLETED"
});

const IdParams = z.object({ id: z.string().uuid() });

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

  // GET /api/v1/internal/interviews/:id — single interview, unfiltered (no
  // per-role visibility). Used by messaging-svc to auto-resolve participant
  // sets when a thread is created against an INTERVIEW context.
  fastify.get(
    "/api/v1/internal/interviews/:id",
    { preHandler: [gate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const row = await interviewRepository.findByIdRaw(id);
      if (!row) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Interview not found" },
        });
      }
      return reply.status(200).send(toInterviewResponse(row));
    },
  );
}
