import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireServiceRole } from "@techorbit/auth-middleware";
import { NotFoundError } from "@techorbit/errors";
import { placementRepository } from "../repositories/placement.repository.js";
import { commissionRuleRepository } from "../repositories/commission-rule.repository.js";
import { prisma } from "../lib/prisma.js";
import { toPlacementResponse } from "../lib/response-mappers.js";

const IdParams = z.object({ id: z.string().uuid() });

const ListQuery = z.object({
  status: z.string().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

// Service-to-service only (SERVICE role).  Used by payments-svc to:
//   - list ACTIVE placements (weekly invoice generation)
//   - get a single placement + its commission rules (by id)
//   - look up commission rules without the visibility filter
export async function internalPlacementRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  const gate = requireServiceRole(fastify);

  // GET /api/v1/internal/placements?status=ACTIVE&cursor=&limit=
  fastify.get(
    "/api/v1/internal/placements",
    { preHandler: [gate] },
    async (request, reply) => {
      const { status, cursor, limit } = ListQuery.parse(request.query);
      const rows = await prisma.placement.findMany({
        where: status ? { status: status as "ACTIVE" } : {},
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      const hasMore = rows.length > limit;
      const data = hasMore ? rows.slice(0, limit) : rows;
      return reply.status(200).send({
        data: data.map(toPlacementResponse),
        nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null,
        hasMore,
      });
    },
  );

  // GET /api/v1/internal/placements/:id
  fastify.get(
    "/api/v1/internal/placements/:id",
    { preHandler: [gate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const row = await placementRepository.findByIdRaw(id);
      if (!row) throw new NotFoundError("Placement not found");
      return reply.status(200).send(toPlacementResponse(row));
    },
  );

  // GET /api/v1/internal/placements/:id/commissions — unfiltered rules
  fastify.get(
    "/api/v1/internal/placements/:id/commissions",
    { preHandler: [gate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const rules = await commissionRuleRepository.findByPlacement(id);
      return reply.status(200).send({
        data: rules.map((r) => ({
          id: r.id,
          placementId: r.placementId,
          slot: r.slot,
          calculation: r.calculation,
          percentOfBillRate:
            r.percentOfBillRate === null ? null : Number(r.percentOfBillRate),
          flatFeeUsd: r.flatFeeUsd === null ? null : Number(r.flatFeeUsd),
          beneficiaryUserId: r.beneficiaryUserId,
          beneficiaryMsmeId: r.beneficiaryMsmeId,
          interviewId: r.interviewId,
          notes: r.notes,
          createdAt: r.createdAt.toISOString(),
        })),
      });
    },
  );

  // GET /api/v1/internal/metrics/total-placements — for the admin dashboard
  fastify.get(
    "/api/v1/internal/metrics/total-placements",
    { preHandler: [gate] },
    async (_request, reply) => {
      const value = await prisma.placement.count();
      return reply.status(200).send({ value });
    },
  );
}
