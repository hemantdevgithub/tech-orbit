import { Decimal } from "decimal.js";
import { randomUUID } from "node:crypto";
import type { Prisma } from "../generated/client/index.js";
import type { GustoClient } from "../lib/gusto-mock.js";
import type { StripeClient } from "../lib/stripe-mock.js";
import { prisma } from "../lib/prisma.js";
import { commissionPayoutRepository } from "../repositories/commission-payout.repository.js";

type Deps = {
  gusto: GustoClient;
  stripe: StripeClient;
  logger: { info: (o: unknown, m?: string) => void; error: (o: unknown, m?: string) => void };
};

export function createPayoutProcessorService(deps: Deps) {
  const { gusto, stripe, logger } = deps;

  return {
    // Called after an invoice is marked PAID.  Walks each PENDING payout
    // on that invoice and routes it:
    //   - CANDIDATE_W2 → Gusto (mocked)
    //   - PLATFORM     → no external transfer (platform is us)
    //   - Everything else (CRM, SRM, MSME, INTERVIEWER) → Stripe Connect
    async processInvoicePayouts(invoiceId: string): Promise<{ processed: number; failed: number }> {
      const payouts = await commissionPayoutRepository.findByInvoice(invoiceId);
      const pending = payouts.filter((p) => p.status === "PENDING");
      logger.info({ invoiceId, count: pending.length }, "Processing payouts");

      let processed = 0;
      let failed = 0;

      for (const p of pending) {
        // Mark PROCESSING first so retries don't double-pay.
        await commissionPayoutRepository.updateStatus(p.id, "PROCESSING");

        try {
          const amount = new Decimal(p.amountUsd.toString());
          let stripeTransferId: string | null = null;
          let gustoPayrollId: string | null = null;

          if (p.slot === "CANDIDATE_W2") {
            if (!p.beneficiaryUserId) throw new Error("CANDIDATE_W2 payout missing beneficiaryUserId");
            const { payrollId } = await gusto.processPayroll({
              candidateUserId: p.beneficiaryUserId,
              amountUsd: amount,
              memo: `Placement ${p.placementId.slice(0, 8)} — invoice ${invoiceId.slice(0, 8)}`,
            });
            gustoPayrollId = payrollId;
          } else if (p.slot === "PLATFORM") {
            // No external transfer — platform retains the amount.
            // Just mark COMPLETED with a synthetic id so it's distinguishable in audit.
            stripeTransferId = `internal_${randomUUID().slice(0, 8)}`;
          } else {
            // CRM / SRM / MSME / INTERVIEWER → Stripe Connect
            const beneficiary = p.beneficiaryUserId ?? p.beneficiaryMsmeId;
            if (!beneficiary) throw new Error(`Payout ${p.id} has no beneficiary`);
            const { id } = await stripe.createConnectTransfer({
              beneficiaryId: beneficiary,
              amountUsd: amount,
              memo: `${p.slot} — placement ${p.placementId.slice(0, 8)} — invoice ${invoiceId.slice(0, 8)}`,
            });
            stripeTransferId = id;
          }

          await prisma.$transaction(async (tx) => {
            await commissionPayoutRepository.updateStatus(
              p.id,
              "COMPLETED",
              {
                processedAt: new Date(),
                stripeTransferId,
                gustoPayrollId,
              },
              tx,
            );
            await tx.outgoingEvent.create({
              data: {
                eventType: "payout.processed.v1",
                aggregateId: p.id,
                payload: {
                  eventId: randomUUID(),
                  type: "payout.processed.v1",
                  version: 1,
                  occurredAt: new Date().toISOString(),
                  payload: {
                    payoutId: p.id,
                    invoiceId,
                    beneficiaryUserId: p.beneficiaryUserId,
                    beneficiaryMsmeId: p.beneficiaryMsmeId,
                    slot: p.slot,
                    amountUsd: Number(amount.toFixed(2)),
                    status: "COMPLETED",
                    processedAt: new Date().toISOString(),
                  },
                } as unknown as Prisma.InputJsonValue,
                status: "PENDING",
                attempts: 0,
              },
            });
          });
          processed += 1;
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          await commissionPayoutRepository.updateStatus(p.id, "FAILED", {
            failureReason: reason,
          });
          logger.error({ payoutId: p.id, reason }, "Payout failed");
          failed += 1;
        }
      }

      return { processed, failed };
    },
  };
}

export type PayoutProcessorService = ReturnType<typeof createPayoutProcessorService>;
