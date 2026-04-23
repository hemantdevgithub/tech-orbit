import type { FastifyInstance } from "fastify";
import { requireServiceRole } from "@techorbit/auth-middleware";
import { GenerateWeeklyInvoicesRequestSchema } from "@techorbit/types";
import type { InvoiceGeneratorService } from "../services/invoice-generator.service.js";

// Service-to-service + admin-triggered routes.  Used by the cron job
// (which uses SERVICE tokens) and for manual triggers during testing.
export async function internalPaymentsRoutes(
  fastify: FastifyInstance,
  options: { invoiceGeneratorService: InvoiceGeneratorService },
): Promise<void> {
  const { invoiceGeneratorService } = options;
  const gate = requireServiceRole(fastify);

  fastify.post(
    "/api/v1/internal/generate-weekly-invoices",
    { preHandler: [gate] },
    async (request, reply) => {
      const body = GenerateWeeklyInvoicesRequestSchema.parse(request.body);
      const result = await invoiceGeneratorService.generateWeeklyInvoices(
        new Date(body.billingPeriodStart),
        new Date(body.billingPeriodEnd),
      );
      return reply.status(200).send(result);
    },
  );
}
