import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  AssignMsmeSchema,
  DeclineInviteSchema,
  InviteCandidateSchema,
} from "@techorbit/types";
import type { SubmissionService } from "../services/submission.service.js";

const IdParams = z.object({ id: z.string().uuid() });

// Sprint 12 — invite-to-submit routes. SRM invites a candidate from their
// portfolio; candidate accepts/declines on a separate submission record.
export async function inviteRoutes(
  fastify: FastifyInstance,
  options: { submissionService: SubmissionService },
): Promise<void> {
  const { submissionService } = options;

  // POST /api/v1/requirements/:id/invite-candidate — SRM-only
  fastify.post(
    "/api/v1/requirements/:id/invite-candidate",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const body = InviteCandidateSchema.parse(request.body);
      const response = await submissionService.inviteCandidate(
        request.auth,
        id,
        body,
      );
      return reply.status(201).send(response);
    },
  );

  // POST /api/v1/submissions/:id/accept-invite — candidate-only
  fastify.post(
    "/api/v1/submissions/:id/accept-invite",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const response = await submissionService.acceptInvite(request.auth, id);
      return reply.status(200).send(response);
    },
  );

  // POST /api/v1/submissions/:id/decline-invite — candidate-only
  fastify.post(
    "/api/v1/submissions/:id/decline-invite",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const body = DeclineInviteSchema.parse(request.body);
      const response = await submissionService.declineInvite(
        request.auth,
        id,
        body,
      );
      return reply.status(200).send(response);
    },
  );

  // POST /api/v1/requirements/:id/assign-to-msme — SRM-only
  // Persists a RequirementMsmeAssignment row and emits
  // requirement.assigned-msme.v1; notification-svc fans out to the MSME.
  fastify.post(
    "/api/v1/requirements/:id/assign-to-msme",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const body = AssignMsmeSchema.parse(request.body);
      const response = await submissionService.assignToMsme(
        request.auth,
        id,
        body,
      );
      return reply.status(200).send(response);
    },
  );

  // GET /api/v1/me/msme-assignments — MSME's inbox
  fastify.get(
    "/api/v1/me/msme-assignments",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const query = z
        .object({
          status: z.enum(["ACTIVE", "SUBMITTED", "DECLINED", "EXPIRED"]).optional(),
        })
        .parse(request.query);
      const data = await submissionService.listMyMsmeAssignments(request.auth, query);
      return reply.status(200).send({ data });
    },
  );

  // POST /api/v1/me/msme-assignments/:id/decline — MSME declines
  fastify.post(
    "/api/v1/me/msme-assignments/:id/decline",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const body = z
        .object({ reason: z.string().min(1).max(500) })
        .parse(request.body);
      const response = await submissionService.declineMsmeAssignment(
        request.auth,
        id,
        body.reason,
      );
      return reply.status(200).send(response);
    },
  );
}
