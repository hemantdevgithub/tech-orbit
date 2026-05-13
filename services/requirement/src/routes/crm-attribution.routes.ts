import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AttributeCrmSchema } from "@techorbit/types";
import type { CrmAttributionService } from "../services/crm-attribution.service.js";

const IdParams = z.object({ id: z.string().uuid() });

export async function crmAttributionRoutes(
  fastify: FastifyInstance,
  options: { crmAttributionService: CrmAttributionService },
): Promise<void> {
  const { crmAttributionService } = options;

  // POST /api/v1/requirements/:id/attribute-crm — a CRM claims attribution.
  // Mounted here (not on the requirements routes file) so the attribution
  // service stays scoped together.
  fastify.post(
    "/api/v1/requirements/:id/attribute-crm",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const body = AttributeCrmSchema.parse(request.body);
      const result = await crmAttributionService.claimAttribution(
        request.auth,
        id,
        body,
      );
      // 200 on auto-confirm, 202 on pending approval.
      const status = result.kind === "attributed" ? 200 : 202;
      return reply.status(status).send(result);
    },
  );

  // GET /api/v1/crm-attribution-requests — customer lists their pending queue.
  fastify.get(
    "/api/v1/crm-attribution-requests",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bearerToken =
        request.headers.authorization?.replace(/^bearer /i, "") ?? "";
      const response = await crmAttributionService.listPendingForCustomer(
        request.auth,
        bearerToken,
      );
      return reply.status(200).send({ data: response });
    },
  );

  // POST /api/v1/crm-attribution-requests/:id/approve
  fastify.post(
    "/api/v1/crm-attribution-requests/:id/approve",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const response = await crmAttributionService.approveAttribution(
        request.auth,
        id,
      );
      return reply.status(200).send(response);
    },
  );

  // POST /api/v1/crm-attribution-requests/:id/reject
  fastify.post(
    "/api/v1/crm-attribution-requests/:id/reject",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const response = await crmAttributionService.rejectAttribution(
        request.auth,
        id,
      );
      return reply.status(200).send(response);
    },
  );
}
