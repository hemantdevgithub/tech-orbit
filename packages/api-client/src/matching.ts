import type { ApiClient } from "./client.js";
import type {
  AssignMsme,
  DeclineInvite,
  DeclineMsmeAssignment,
  InviteCandidate,
  MatchingSignalResponse,
  MsmeAssignmentListResponse,
  MsmeAssignmentStatus,
  SubmissionFilter,
  SubmissionListResponse,
  SubmissionRequest,
  SubmissionResponse,
  UpdateSubmissionStatus,
  WithdrawSubmission,
} from "@techorbit/types";

export class MatchingApiClient {
  constructor(private client: ApiClient) {}

  createSubmission(data: SubmissionRequest): Promise<SubmissionResponse> {
    return this.client.post("/api/v1/submissions", data);
  }

  listSubmissions(filters?: SubmissionFilter): Promise<SubmissionListResponse> {
    const search = filters ? toQueryString(filters) : "";
    return this.client.get(`/api/v1/submissions${search}`);
  }

  getSubmission(id: string): Promise<SubmissionResponse> {
    return this.client.get(`/api/v1/submissions/${id}`);
  }

  updateStatus(
    id: string,
    data: UpdateSubmissionStatus,
  ): Promise<SubmissionResponse> {
    return this.client.patch(`/api/v1/submissions/${id}/status`, data);
  }

  withdraw(id: string, data: WithdrawSubmission): Promise<SubmissionResponse> {
    return this.client.post(`/api/v1/submissions/${id}/withdraw`, data);
  }

  matchesForRequirement(
    requirementId: string,
    limit?: number,
  ): Promise<{ data: MatchingSignalResponse[] }> {
    const search = limit ? `?limit=${limit}` : "";
    return this.client.get(
      `/api/v1/matches/for-requirement/${requirementId}${search}`,
    );
  }

  // ─── Sprint 12 — invite-to-submit ─────────────────────────────────────────

  inviteCandidate(
    requirementId: string,
    data: InviteCandidate,
  ): Promise<SubmissionResponse> {
    return this.client.post(
      `/api/v1/requirements/${requirementId}/invite-candidate`,
      data,
    );
  }

  acceptInvite(submissionId: string): Promise<SubmissionResponse> {
    return this.client.post(
      `/api/v1/submissions/${submissionId}/accept-invite`,
      {},
    );
  }

  declineInvite(
    submissionId: string,
    data: DeclineInvite,
  ): Promise<SubmissionResponse> {
    return this.client.post(
      `/api/v1/submissions/${submissionId}/decline-invite`,
      data,
    );
  }

  assignToMsme(
    requirementId: string,
    data: AssignMsme,
  ): Promise<{ ok: true }> {
    return this.client.post(
      `/api/v1/requirements/${requirementId}/assign-to-msme`,
      data,
    );
  }

  listMyMsmeAssignments(filters?: {
    status?: MsmeAssignmentStatus;
  }): Promise<MsmeAssignmentListResponse> {
    const search = filters?.status ? `?status=${filters.status}` : "";
    return this.client.get(`/api/v1/me/msme-assignments${search}`);
  }

  declineMsmeAssignment(
    id: string,
    data: DeclineMsmeAssignment,
  ): Promise<{ ok: true }> {
    return this.client.post(
      `/api/v1/me/msme-assignments/${id}/decline`,
      data,
    );
  }
}

export function createMatchingApiClient(client: ApiClient): MatchingApiClient {
  return new MatchingApiClient(client);
}

function toQueryString(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  const str = params.toString();
  return str ? `?${str}` : "";
}
