import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { PayoutFilterSchema } from "@techorbit/types";
import type { PayoutService } from "../services/payout.service.js";

const IdParams = z.object({ id: z.string().uuid() });

export async function payoutRoutes(
  fastify: FastifyInstance,
  options: { payoutService: PayoutService },
): Promise<void> {
  const { payoutService } = options;

  fastify.get(
    "/api/v1/payouts",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const filters = PayoutFilterSchema.parse(request.query);
      const result = await payoutService.listPayouts(request.auth, filters);
      return reply.status(200).send(result);
    },
  );

  fastify.get(
    "/api/v1/payouts/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const result = await payoutService.getPayout(request.auth, id);
      return reply.status(200).send(result);
    },
  );
}
