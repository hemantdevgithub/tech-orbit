import type {
  InvoiceFilter,
  InvoiceListResponse,
  InvoiceResponse,
} from "@techorbit/types";
import type { AuthContext } from "@techorbit/auth-middleware";
import { ConflictError, ForbiddenError, NotFoundError } from "@techorbit/errors";
import { invoiceRepository } from "../repositories/invoice.repository.js";
import { toInvoiceResponse } from "../lib/response-mappers.js";
import type { PayoutProcessorService } from "./payout-processor.service.js";

// profile-api: just enough to resolve the caller's CustomerCompanyProfile.id
// so we can scope invoice visibility.  We fetch lazily — most callers are
// already-known customer owners.
type ProfileApiLite = {
  getCustomerByUserId(userId: string): Promise<{ id: string } | null>;
};

type Deps = {
  profileApi: ProfileApiLite;
  payoutProcessor: PayoutProcessorService;
  logger: { info: (o: unknown, m?: string) => void };
};

export function createInvoiceService(deps: Deps) {
  const { profileApi, payoutProcessor, logger } = deps;

  async function resolveScope(ctx: AuthContext): Promise<string | null> {
    if (ctx.roles.includes("ADMIN")) return null;
    const company = await profileApi.getCustomerByUserId(ctx.userId);
    return company?.id ?? null;
  }

  return {
    async getInvoice(ctx: AuthContext, id: string): Promise<InvoiceResponse> {
      const scope = await resolveScope(ctx);
      const row = await invoiceRepository.findById(ctx, id, scope);
      return toInvoiceResponse(row);
    },

    async listInvoices(
      ctx: AuthContext,
      filters: InvoiceFilter,
    ): Promise<InvoiceListResponse> {
      const scope = await resolveScope(ctx);
      const { limit, cursor, billingPeriodFrom, billingPeriodTo, ...rest } = filters;
      const result = await invoiceRepository.list(
        ctx,
        {
          ...rest,
          billingPeriodFrom: billingPeriodFrom ? new Date(billingPeriodFrom) : undefined,
          billingPeriodTo: billingPeriodTo ? new Date(billingPeriodTo) : undefined,
          scopeCustomerCompanyId: scope ?? undefined,
        },
        cursor ?? null,
        limit,
      );
      return {
        data: result.data.map((inv) => {
          const mapped = toInvoiceResponse(inv as typeof inv & { lineItems: [] });
          // Strip lineItems for list response (shape requires omitted field).
          const { lineItems: _omitted, ...rest } = mapped;
          void _omitted;
          return rest;
        }),
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      };
    },

    async markInvoicePaid(ctx: AuthContext, id: string): Promise<InvoiceResponse> {
      // For v1: only admin (or internal webhook) can mark paid.  Customers
      // pay via Stripe which triggers a webhook in prod; here we expose an
      // admin-only endpoint for manual recording.
      if (!ctx.roles.includes("ADMIN")) {
        throw new ForbiddenError("Only admins can mark invoices as paid");
      }
      const existing = await invoiceRepository.findById(ctx, id, null);
      if (!existing) throw new NotFoundError("Invoice not found");
      if (existing.status !== "SENT" && existing.status !== "OVERDUE") {
        throw new ConflictError(
          `Cannot mark invoice as paid from status ${existing.status}`,
        );
      }

      const updated = await invoiceRepository.updateStatus(id, "PAID", {
        paidAt: new Date(),
      });
      logger.info({ invoiceId: id }, "Invoice marked paid; triggering payouts");

      // Fire-and-forget the payout processing.  In prod this would happen
      // via event consumer, but we do it inline here for simplicity.
      void payoutProcessor.processInvoicePayouts(id).catch((err) => {
        logger.info({ invoiceId: id, err: String(err) }, "Payout processing error");
      });

      const full = await invoiceRepository.findById(ctx, id, null);
      return toInvoiceResponse({ ...full, status: updated.status, paidAt: updated.paidAt });
    },
  };
}

export type InvoiceService = ReturnType<typeof createInvoiceService>;
