import type { FastifyInstance } from "fastify";
import { requireServiceRole } from "@techorbit/auth-middleware";
import { GenerateWeeklyInvoicesRequestSchema } from "@techorbit/types";
import type { InvoiceGeneratorService } from "../services/invoice-generator.service.js";
import { prisma } from "../lib/prisma.js";

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

  // GET /api/v1/internal/metrics/gmv-this-month — admin dashboard metric.
  // Sum of totalUsd for invoices billed this calendar month.
  fastify.get(
    "/api/v1/internal/metrics/gmv-this-month",
    { preHandler: [gate] },
    async (_request, reply) => {
      const now = new Date();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      const agg = await prisma.invoice.aggregate({
        where: { billingPeriodStart: { gte: monthStart, lt: monthEnd } },
        _sum: { totalUsd: true },
      });
      const value = agg._sum.totalUsd ? Number(agg._sum.totalUsd) : 0;
      return reply.status(200).send({ value });
    },
  );
}
