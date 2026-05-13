import type {
  CommissionPayoutListResponse,
  CommissionPayoutResponse,
  PayoutFilter,
} from "@techorbit/types";
import type { AuthContext } from "@techorbit/auth-middleware";
import { ForbiddenError, NotFoundError } from "@techorbit/errors";
import { commissionPayoutRepository } from "../repositories/commission-payout.repository.js";
import { toPayoutResponse } from "../lib/response-mappers.js";

export function createPayoutService() {
  return {
    async listPayouts(
      ctx: AuthContext,
      filters: PayoutFilter,
    ): Promise<CommissionPayoutListResponse> {
      const { limit, cursor, ...rest } = filters;
      const result = await commissionPayoutRepository.list(
        ctx,
        rest,
        cursor ?? null,
        limit,
      );
      return {
        data: result.data.map(toPayoutResponse),
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      };
    },

    async getPayout(
      ctx: AuthContext,
      id: string,
    ): Promise<CommissionPayoutResponse> {
      const p = await commissionPayoutRepository.findById(id);
      if (!p) throw new NotFoundError("Payout not found");

      const isAdmin = ctx.roles.includes("ADMIN");
      const isBeneficiary = p.beneficiaryUserId === ctx.userId;
      if (!isAdmin && !isBeneficiary) {
        throw new ForbiddenError("Cannot access this payout");
      }
      return toPayoutResponse(p);
    },
  };
}

export type PayoutService = ReturnType<typeof createPayoutService>;
