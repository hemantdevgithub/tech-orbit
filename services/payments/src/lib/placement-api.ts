import { InternalError } from "@techorbit/errors";
import type { ServiceTokenSigner } from "./service-token.js";
import type { CommissionRuleInput } from "../services/payout-calculator.js";
import { Decimal } from "decimal.js";

export type PlacementSummary = {
  id: string;
  requirementId: string;
  submissionId: string;
  candidateId: string;
  customerCompanyId: string;
  createdByUserId: string;
  engagementType: "W2" | "C2C" | "IC_1099";
  billRateUsd: number;
  payRateUsd: number | null;
  startDate: string;
  endDate: string;
  status: string;
};

export type PlacementApi = {
  getPlacement(id: string): Promise<PlacementSummary | null>;
  listActivePlacements(opts?: { cursor?: string; limit?: number }): Promise<{
    data: PlacementSummary[];
    nextCursor: string | null;
    hasMore: boolean;
  }>;
  getCommissionRules(placementId: string): Promise<CommissionRuleInput[]>;
};

type RawRule = {
  id: string;
  placementId: string;
  slot: string;
  calculation: string;
  percentOfBillRate: number | null;
  flatFeeUsd: number | null;
  beneficiaryUserId: string | null;
  beneficiaryMsmeId: string | null;
  interviewId: string | null;
};

export function createPlacementApi(
  placementSvcUrl: string,
  signer: ServiceTokenSigner,
): PlacementApi {
  async function svcFetch(path: string): Promise<Response> {
    const token = await signer.getToken();
    try {
      return await fetch(`${placementSvcUrl}${path}`, {
        headers: { authorization: `Bearer ${token}` },
      });
    } catch (err) {
      throw new InternalError(`placement-svc unreachable: ${(err as Error).message}`);
    }
  }

  return {
    async getPlacement(id) {
      const res = await svcFetch(`/api/v1/internal/placements/${id}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new InternalError(`placement-svc returned ${res.status}`);
      return (await res.json()) as PlacementSummary;
    },

    async listActivePlacements({ cursor, limit = 100 } = {}) {
      const q = new URLSearchParams({ status: "ACTIVE", limit: String(limit) });
      if (cursor) q.set("cursor", cursor);
      const res = await svcFetch(`/api/v1/internal/placements?${q.toString()}`);
      if (!res.ok) throw new InternalError(`placement-svc returned ${res.status}`);
      return (await res.json()) as {
        data: PlacementSummary[];
        nextCursor: string | null;
        hasMore: boolean;
      };
    },

    async getCommissionRules(placementId) {
      const res = await svcFetch(`/api/v1/internal/placements/${placementId}/commissions`);
      if (!res.ok) throw new InternalError(`placement-svc returned ${res.status}`);
      const body = (await res.json()) as { data: RawRule[] };
      return body.data.map((r) => ({
        id: r.id,
        slot: r.slot as CommissionRuleInput["slot"],
        calculation: r.calculation as CommissionRuleInput["calculation"],
        percentOfBillRate:
          r.percentOfBillRate === null ? null : new Decimal(String(r.percentOfBillRate)),
        flatFeeUsd: r.flatFeeUsd === null ? null : new Decimal(String(r.flatFeeUsd)),
        beneficiaryUserId: r.beneficiaryUserId,
        beneficiaryMsmeId: r.beneficiaryMsmeId,
      }));
    },
  };
}
