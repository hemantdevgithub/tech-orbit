import type { ApiClient } from "./client.js";
import type {
  AttributeCrm,
  CloseRequirement,
  CreateRequirement,
  CrmAttributionRequestResponse,
  RequirementFilter,
  RequirementListResponse,
  RequirementResponse,
  UpdateRequirement,
} from "@techorbit/types";

// The CRM-claim endpoint returns one of two shapes depending on whether
// attribution resolved immediately (already-attributed match) or is pending
// customer approval.
export type ClaimAttributionResult =
  | { kind: "attributed"; requirement: RequirementResponse }
  | { kind: "pending"; request: CrmAttributionRequestResponse };

export class RequirementApiClient {
  constructor(private client: ApiClient) {}

  // ─── Requirements ──────────────────────────────────────────────────────────

  create(data: CreateRequirement): Promise<RequirementResponse> {
    return this.client.post("/api/v1/requirements", data);
  }

  list(filters?: RequirementFilter): Promise<RequirementListResponse> {
    const search = filters ? toQueryString(filters) : "";
    return this.client.get(`/api/v1/requirements${search}`);
  }

  getById(id: string): Promise<RequirementResponse> {
    return this.client.get(`/api/v1/requirements/${id}`);
  }

  update(id: string, data: UpdateRequirement): Promise<RequirementResponse> {
    return this.client.patch(`/api/v1/requirements/${id}`, data);
  }

  publish(id: string): Promise<RequirementResponse> {
    return this.client.post(`/api/v1/requirements/${id}/publish`, {});
  }

  close(id: string, data: CloseRequirement): Promise<RequirementResponse> {
    return this.client.post(`/api/v1/requirements/${id}/close`, data);
  }

  // ─── CRM attribution ──────────────────────────────────────────────────────

  claimAttribution(
    requirementId: string,
    data: AttributeCrm,
  ): Promise<ClaimAttributionResult> {
    return this.client.post(
      `/api/v1/requirements/${requirementId}/attribute-crm`,
      data,
    );
  }

  listPendingAttributions(): Promise<{ data: CrmAttributionRequestResponse[] }> {
    return this.client.get("/api/v1/crm-attribution-requests");
  }

  approveAttribution(id: string): Promise<CrmAttributionRequestResponse> {
    return this.client.post(
      `/api/v1/crm-attribution-requests/${id}/approve`,
      {},
    );
  }

  rejectAttribution(id: string): Promise<CrmAttributionRequestResponse> {
    return this.client.post(
      `/api/v1/crm-attribution-requests/${id}/reject`,
      {},
    );
  }
}

export function createRequirementApiClient(
  client: ApiClient,
): RequirementApiClient {
  return new RequirementApiClient(client);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toQueryString(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, String(v));
    } else {
      params.set(key, String(value));
    }
  }
  const str = params.toString();
  return str ? `?${str}` : "";
}
