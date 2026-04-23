import { Decimal } from "decimal.js";
import { Decimal as PrismaDecimal } from "@prisma/client/runtime/library";
import type { PlacementApi } from "../lib/placement-api.js";
import { prisma } from "../lib/prisma.js";
import { invoiceRepository } from "../repositories/invoice.repository.js";
import { timesheetRepository } from "../repositories/timesheet.repository.js";
import { commissionPayoutRepository } from "../repositories/commission-payout.repository.js";
import { buildEvent, enqueueEvent } from "../lib/outbox.js";
import {
  calculateWeeklyPayouts,
  calculateInterviewerFeePayouts,
  type CommissionRuleInput,
} from "./payout-calculator.js";

type Deps = { placementApi: PlacementApi; logger: { info: (o: unknown, m?: string) => void; warn: (o: unknown, m?: string) => void } };

export function createInvoiceGeneratorService(deps: Deps) {
  const { placementApi, logger } = deps;

  return {
    // Idempotent by (customerCompanyId, invoiceType, billingPeriodStart, placementId).
    // Groups timesheets by customer, creates one WEEKLY_HOURS invoice per
    // customer with line items per (placement, timesheet), and creates
    // commission payouts for each placement based on hours × commission rules.
    async generateWeeklyInvoices(
      billingPeriodStart: Date,
      billingPeriodEnd: Date,
    ): Promise<{ invoicesCreated: number; invoicesSkipped: number }> {
      logger.info(
        { billingPeriodStart, billingPeriodEnd },
        "Starting weekly invoice generation",
      );

      // Fetch all ACTIVE placements, paginated.
      const activePlacements: Awaited<ReturnType<typeof placementApi.listActivePlacements>>["data"] = [];
      let cursor: string | undefined;
      while (true) {
        const page = await placementApi.listActivePlacements({ cursor, limit: 100 });
        activePlacements.push(...page.data);
        if (!page.hasMore || !page.nextCursor) break;
        cursor = page.nextCursor;
      }

      // Group by customer
      const byCustomer = new Map<string, typeof activePlacements>();
      for (const p of activePlacements) {
        const arr = byCustomer.get(p.customerCompanyId) ?? [];
        arr.push(p);
        byCustomer.set(p.customerCompanyId, arr);
      }

      let invoicesCreated = 0;
      let invoicesSkipped = 0;

      for (const [customerCompanyId, placements] of byCustomer) {
        // Idempotency check: skip if an invoice already exists for this
        // window, since the job may run twice (retry, manual trigger, etc).
        const existing = await invoiceRepository.existsForCustomerPeriod(
          customerCompanyId,
          "WEEKLY_HOURS",
          billingPeriodStart,
          null,
        );
        if (existing) {
          invoicesSkipped += 1;
          logger.info(
            { customerCompanyId, invoiceId: existing.id },
            "Invoice already exists for this billing period; skipping",
          );
          continue;
        }

        // Gather approved timesheets in the window across all placements
        // for this customer, plus the rules for each placement.
        type LineCtx = {
          placementId: string;
          billRateUsd: Decimal;
          timesheetId: string;
          hoursWorked: Decimal;
          candidateId: string;
          rules: CommissionRuleInput[];
        };
        const lineCtxs: LineCtx[] = [];

        for (const p of placements) {
          const rules = await placementApi.getCommissionRules(p.id);
          const approved = await timesheetRepository.findApprovedInWindow(
            p.id,
            billingPeriodStart,
            billingPeriodEnd,
          );
          for (const ts of approved) {
            lineCtxs.push({
              placementId: p.id,
              billRateUsd: new Decimal(String(p.billRateUsd)),
              timesheetId: ts.id,
              hoursWorked: new Decimal(ts.hoursWorked.toString()),
              candidateId: p.candidateId,
              rules,
            });
          }
        }

        if (lineCtxs.length === 0) {
          invoicesSkipped += 1;
          continue;
        }

        // Invoice totals
        const subtotal = lineCtxs.reduce(
          (s, c) => s.plus(c.hoursWorked.mul(c.billRateUsd)),
          new Decimal(0),
        );

        const invoice = await prisma.$transaction(async (tx) => {
          const inv = await invoiceRepository.createWithLineItems(
            {
              customerCompanyId,
              invoiceType: "WEEKLY_HOURS",
              billingPeriodStart,
              billingPeriodEnd,
              subtotalUsd: new PrismaDecimal(subtotal.toFixed(2)),
              totalUsd: new PrismaDecimal(subtotal.toFixed(2)),
              // Due in 30 days
              dueDate: new Date(Date.now() + 30 * 86400_000),
            },
            lineCtxs.map((c) => ({
              placementId: c.placementId,
              timesheetId: c.timesheetId,
              description: `Placement ${c.placementId.slice(0, 8)} — Week of ${billingPeriodStart.toISOString().slice(0, 10)}`,
              hoursWorked: new PrismaDecimal(c.hoursWorked.toFixed(2)),
              rateUsd: new PrismaDecimal(c.billRateUsd.toFixed(2)),
              amountUsd: new PrismaDecimal(c.hoursWorked.mul(c.billRateUsd).toFixed(2)),
            })),
            tx,
          );

          // Now mark those timesheets as INVOICED
          for (const c of lineCtxs) {
            await timesheetRepository.updateStatus(
              c.timesheetId,
              "INVOICED",
              { invoiceId: inv.id },
              tx,
            );
          }

          // Per-placement payout calculations
          for (const p of placements) {
            const placementCtxs = lineCtxs.filter((c) => c.placementId === p.id);
            if (placementCtxs.length === 0) continue;
            const totalHours = placementCtxs.reduce(
              (s, c) => s.plus(c.hoursWorked),
              new Decimal(0),
            );
            const rules = placementCtxs[0]!.rules;
            const payouts = calculateWeeklyPayouts({
              placementId: p.id,
              invoiceId: inv.id,
              billRateUsd: new Decimal(String(p.billRateUsd)),
              totalHoursWorked: totalHours,
              commissionRules: rules,
            });
            await commissionPayoutRepository.createMany(
              payouts.map((po) => ({
                invoiceId: po.invoiceId,
                placementId: po.placementId,
                commissionRuleId: po.commissionRuleId,
                beneficiaryUserId: po.beneficiaryUserId,
                beneficiaryMsmeId: po.beneficiaryMsmeId,
                slot: po.slot,
                amountUsd: new PrismaDecimal(po.amountUsd.toFixed(2)),
              })),
              tx,
            );
          }

          // Auto-send: DRAFT → SENT immediately (per plan).
          await invoiceRepository.updateStatus(
            inv.id,
            "SENT",
            { sentAt: new Date() },
            tx,
          );

          await enqueueEvent(
            tx,
            buildEvent("invoice.generated.v1", {
              invoiceId: inv.id,
              customerCompanyId,
              invoiceType: "WEEKLY_HOURS",
              billingPeriodStart: billingPeriodStart.toISOString(),
              totalUsd: Number(subtotal.toFixed(2)),
              generatedAt: new Date().toISOString(),
            }),
            inv.id,
          );

          return inv;
        });

        invoicesCreated += 1;
        logger.info(
          { customerCompanyId, invoiceId: invoice.id, total: subtotal.toFixed(2) },
          "Weekly invoice generated",
        );
      }

      logger.info(
        { invoicesCreated, invoicesSkipped },
        "Weekly invoice generation complete",
      );
      return { invoicesCreated, invoicesSkipped };
    },

    // Called by the placement.created.v1 consumer.  Creates a
    // per-placement INTERVIEWER_FEES invoice for the sum of interviewer
    // flat fees on that placement.  Idempotent.
    async generateInterviewerFeesInvoice(placementId: string): Promise<{
      created: boolean;
      invoiceId: string | null;
      totalUsd: number;
    }> {
      const placement = await placementApi.getPlacement(placementId);
      if (!placement) {
        logger.warn({ placementId }, "Placement not found; skipping interviewer-fees invoice");
        return { created: false, invoiceId: null, totalUsd: 0 };
      }
      const rules = await placementApi.getCommissionRules(placementId);
      const interviewerRules = rules.filter(
        (r) => r.slot === "INTERVIEWER" && r.calculation === "FLAT_FEE" && r.flatFeeUsd !== null,
      );
      if (interviewerRules.length === 0) {
        return { created: false, invoiceId: null, totalUsd: 0 };
      }

      // Idempotency: skip if we've already generated an interviewer-fees
      // invoice for this placement.
      const existing = await invoiceRepository.existsForCustomerPeriod(
        placement.customerCompanyId,
        "INTERVIEWER_FEES",
        new Date(placement.startDate),
        placementId,
      );
      if (existing) {
        return { created: false, invoiceId: existing.id, totalUsd: Number(existing.totalUsd) };
      }

      const subtotal = interviewerRules.reduce(
        (s, r) => s.plus(r.flatFeeUsd!),
        new Decimal(0),
      );

      const invoice = await prisma.$transaction(async (tx) => {
        const inv = await invoiceRepository.createWithLineItems(
          {
            customerCompanyId: placement.customerCompanyId,
            placementId,
            invoiceType: "INTERVIEWER_FEES",
            // Use the placement's startDate as the "billing period" for
            // idempotency purposes — placements don't typically start
            // mid-week so this collides cleanly with retries.
            billingPeriodStart: new Date(placement.startDate),
            billingPeriodEnd: new Date(placement.startDate),
            subtotalUsd: new PrismaDecimal(subtotal.toFixed(2)),
            totalUsd: new PrismaDecimal(subtotal.toFixed(2)),
            dueDate: new Date(Date.now() + 14 * 86400_000), // 14-day terms on flat fees
          },
          interviewerRules.map((r) => ({
            placementId,
            description: `Interviewer fee — ${r.beneficiaryUserId ? "user " + r.beneficiaryUserId.slice(0, 8) : "interviewer"}`,
            amountUsd: new PrismaDecimal(r.flatFeeUsd!.toFixed(2)),
          })),
          tx,
        );

        const payouts = calculateInterviewerFeePayouts({
          placementId,
          invoiceId: inv.id,
          commissionRules: interviewerRules,
        });
        await commissionPayoutRepository.createMany(
          payouts.map((po) => ({
            invoiceId: po.invoiceId,
            placementId: po.placementId,
            commissionRuleId: po.commissionRuleId,
            beneficiaryUserId: po.beneficiaryUserId,
            beneficiaryMsmeId: po.beneficiaryMsmeId,
            slot: po.slot,
            amountUsd: new PrismaDecimal(po.amountUsd.toFixed(2)),
          })),
          tx,
        );

        await invoiceRepository.updateStatus(
          inv.id,
          "SENT",
          { sentAt: new Date() },
          tx,
        );

        await enqueueEvent(
          tx,
          buildEvent("invoice.generated.v1", {
            invoiceId: inv.id,
            customerCompanyId: placement.customerCompanyId,
            invoiceType: "INTERVIEWER_FEES",
            billingPeriodStart: new Date(placement.startDate).toISOString(),
            totalUsd: Number(subtotal.toFixed(2)),
            generatedAt: new Date().toISOString(),
          }),
          inv.id,
        );
        return inv;
      });

      return {
        created: true,
        invoiceId: invoice.id,
        totalUsd: Number(subtotal.toFixed(2)),
      };
    },
  };
}

export type InvoiceGeneratorService = ReturnType<typeof createInvoiceGeneratorService>;
