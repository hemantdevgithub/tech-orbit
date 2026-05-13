import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireServiceRole } from "@techorbit/auth-middleware";
import { NotFoundError } from "@techorbit/errors";
import { submissionRepository } from "../repositories/submission.repository.js";
import { toSubmissionResponse } from "../lib/response-mappers.js";

const IdParams = z.object({ id: z.string().uuid() });

// Service-to-service only.  Skips visibility scoping so interview-svc
// can validate a submission's status without a user JWT.
export async function internalMatchingRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  const gate = requireServiceRole(fastify);

  fastify.get(
    "/api/v1/internal/submissions/:id",
    { preHandler: [gate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const row = await submissionRepository.findByIdRaw(id);
      if (!row) throw new NotFoundError("Submission not found");
      return reply.status(200).send(toSubmissionResponse(row));
    },
  );
}
