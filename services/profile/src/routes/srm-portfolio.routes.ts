import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  MemberRequestJoinSchema,
  PortfolioMemberType,
  PortfolioMembershipStatus,
  PortfolioRejectSchema,
  SrmInviteMemberSchema,
} from "@techorbit/types";
import { srmPortfolioService } from "../services/srm-portfolio.service.js";

const IdParams = z.object({ id: z.string().uuid() });

const SrmListQuery = z.object({
  status: PortfolioMembershipStatus.optional(),
  memberType: PortfolioMemberType.optional(),
});

const MemberListQuery = z.object({
  status: PortfolioMembershipStatus.optional(),
});

// Sprint 12 — SRM portfolio (two-sided handshake).
export async function srmPortfolioRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/v1/me/srm-roster/invite — SRM invites a candidate / MSME
  fastify.post(
    "/api/v1/me/srm-roster/invite",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = SrmInviteMemberSchema.parse(request.body);
      const response = await srmPortfolioService.srmInvite(request.auth, body);
      return reply.status(201).send(response);
    },
  );

  // POST /api/v1/srm-roster/request-join — candidate / MSME requests to join
  fastify.post(
    "/api/v1/srm-roster/request-join",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = MemberRequestJoinSchema.parse(request.body);
      const response = await srmPortfolioService.memberRequestJoin(request.auth, body);
      return reply.status(201).send(response);
    },
  );

  // POST /api/v1/srm-portfolio-requests/:id/approve
  fastify.post(
    "/api/v1/srm-portfolio-requests/:id/approve",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const response = await srmPortfolioService.approve(request.auth, id);
      return reply.status(200).send(response);
    },
  );

  // POST /api/v1/srm-portfolio-requests/:id/reject
  fastify.post(
    "/api/v1/srm-portfolio-requests/:id/reject",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const body = PortfolioRejectSchema.parse(request.body ?? {});
      const response = await srmPortfolioService.reject(request.auth, id, body);
      return reply.status(200).send(response);
    },
  );

  // GET /api/v1/me/srm-roster — SRM lists their portfolio
  fastify.get(
    "/api/v1/me/srm-roster",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const filters = SrmListQuery.parse(request.query);
      const data = await srmPortfolioService.listForSrm(request.auth, filters);
      return reply.status(200).send({ data });
    },
  );

  // GET /api/v1/me/srm-portfolio — candidate / MSME view of their links
  fastify.get(
    "/api/v1/me/srm-portfolio",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const filters = MemberListQuery.parse(request.query);
      const data = await srmPortfolioService.listForMember(request.auth, filters);
      return reply.status(200).send({ data });
    },
  );
}
