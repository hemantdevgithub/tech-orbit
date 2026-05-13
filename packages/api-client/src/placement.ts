import type { ApiClient } from "./client.js";
import type {
  CommissionRuleListResponse,
  CreatePlacementRequest,
  EndPlacement,
  PlacementFilter,
  PlacementListResponse,
  PlacementResponse,
  ValueChainResponse,
} from "@techorbit/types";

export type CreatePlacementResult = {
  placement: PlacementResponse;
  valueChain: ValueChainResponse;
  rules: CommissionRuleListResponse;
};

export class PlacementApiClient {
  constructor(private client: ApiClient) {}

  create(data: CreatePlacementRequest): Promise<CreatePlacementResult> {
    return this.client.post("/api/v1/placements", data);
  }

  list(filters?: PlacementFilter): Promise<PlacementListResponse> {
    const q = filters ? toQueryString(filters) : "";
    return this.client.get(`/api/v1/placements${q}`);
  }

  getById(id: string): Promise<PlacementResponse> {
    return this.client.get(`/api/v1/placements/${id}`);
  }

  getValueChain(id: string): Promise<ValueChainResponse> {
    return this.client.get(`/api/v1/placements/${id}/value-chain`);
  }

  getCommissions(id: string): Promise<CommissionRuleListResponse> {
    return this.client.get(`/api/v1/placements/${id}/commissions`);
  }

  end(id: string, data: EndPlacement): Promise<PlacementResponse> {
    return this.client.post(`/api/v1/placements/${id}/end`, data);
  }
}

export function createPlacementApiClient(client: ApiClient): PlacementApiClient {
  return new PlacementApiClient(client);
}

function toQueryString(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}
