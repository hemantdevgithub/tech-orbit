import { InternalError } from "@techorbit/errors";
import type { ServiceTokenSigner } from "./service-token.js";

export type PlacementSummary = {
  id: string;
  candidateId: string;
  createdByUserId: string;
  status: string;
};

export type PlacementApi = {
  getPlacement(id: string): Promise<PlacementSummary | null>;
};

export function createPlacementApi(
  placementSvcUrl: string,
  signer: ServiceTokenSigner,
): PlacementApi {
  return {
    async getPlacement(id: string) {
      const token = await signer.getToken();
      let res: Response;
      try {
        res = await fetch(`${placementSvcUrl}/api/v1/internal/placements/${id}`, {
          headers: { authorization: `Bearer ${token}` },
        });
      } catch (err) {
        throw new InternalError(`placement-svc unreachable: ${(err as Error).message}`);
      }
      if (res.status === 404) return null;
      if (!res.ok) throw new InternalError(`placement-svc returned ${res.status}`);
      return (await res.json()) as PlacementSummary;
    },
  };
}
