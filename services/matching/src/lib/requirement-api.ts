import { InternalError } from "@techorbit/errors";
import type { ServiceTokenSigner } from "./service-token.js";

export type RequirementSummary = {
  id: string;
  customerCompanyId: string;
  createdByUserId: string;
  attributedCrmId: string | null;
  title: string;
  techStack: string[];
  seniority: "JUNIOR" | "MID" | "SENIOR" | "STAFF" | "PRINCIPAL" | "PARTNER";
  locationType: "ONSITE" | "HYBRID" | "REMOTE";
  locationCity: string | null;
  locationState: string | null;
  workAuthPrefs: string[];
  status: string;
  blindPosting: boolean;
  publishedAt: string | null;
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
        throw new InternalError(
          `Failed to reach requirement-svc: ${(err as Error).message}`,
        );
      }
      if (res.status === 404) return null;
      if (!res.ok) {
        throw new InternalError(
          `requirement-svc /internal/requirements/${id} returned ${res.status}`,
        );
      }
      const body = (await res.json()) as RequirementSummary;
      return body;
    },
  };
}
