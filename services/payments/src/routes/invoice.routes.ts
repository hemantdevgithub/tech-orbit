import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { InvoiceFilterSchema } from "@techorbit/types";
import type { InvoiceService } from "../services/invoice.service.js";

const IdParams = z.object({ id: z.string().uuid() });

export async function invoiceRoutes(
  fastify: FastifyInstance,
  options: { invoiceService: InvoiceService },
): Promise<void> {
  const { invoiceService } = options;

  fastify.get(
    "/api/v1/invoices",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const filters = InvoiceFilterSchema.parse(request.query);
      const result = await invoiceService.listInvoices(request.auth, filters);
      return reply.status(200).send(result);
    },
  );

  fastify.get(
    "/api/v1/invoices/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const result = await invoiceService.getInvoice(request.auth, id);
      return reply.status(200).send(result);
    },
  );

  fastify.post(
    "/api/v1/invoices/:id/mark-paid",
    {
      preHandler: [fastify.authenticate],
      config: {
        rateLimit: {
          max: 30,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const result = await invoiceService.markInvoicePaid(request.auth, id);
      return reply.status(200).send(result);
    },
  );
}
