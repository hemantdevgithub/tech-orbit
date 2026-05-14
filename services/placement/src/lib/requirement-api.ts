import { InternalError } from "@techorbit/errors";
import type { ServiceTokenSigner } from "./service-token.js";

export type CrmOwnerSummary = {
  crmUserId: string;
  isPrimary: boolean;
  commissionShare: number;
  acceptedAt: string;
};

export type RequirementSummary = {
  id: string;
  customerCompanyId: string;
  createdByUserId: string;
  attributedCrmId: string | null;
  // Sprint 12 — co-ownership. When non-empty, placement-svc splits the CRM
  // slot proportionally; when empty, falls back to the legacy single-CRM
  // attributedCrmId path.
  crmOwners?: CrmOwnerSummary[];
  title: string;
  status: string;
  locationType: string;
};

export type RequirementApi = {
  getRequirement(id: string): Promise<RequirementSummary | null>;
};

export function createRequirementApi(
  requirementSvcUrl: string,
  signer: ServiceTokenSigner,
): RequirementApi {
  return {
    async getRequirement(id) {
      const token = await signer.getToken();
      let res: Response;
      try {
        res = await fetch(
          `${requirementSvcUrl}/api/v1/internal/requirements/${id}`,
          { headers: { authorization: `Bearer ${token}` } },
        );
      } catch (err) {
        throw new InternalError(`requirement-svc unreachable: ${(err as Error).message}`);
      }
      if (res.status === 404) return null;
      if (!res.ok) throw new InternalError(`requirement-svc returned ${res.status}`);
      return (await res.json()) as RequirementSummary;
    },
  };
}
