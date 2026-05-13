import type { ApiClient } from "./client.js";
import type {
  AddDisputeNote,
  ApproveApplication,
  AuditLogFilter,
  AuditLogListResponse,
  BanUser,
  CreateDisputeRequest,
  DashboardMetricsResponse,
  DisputeFilter,
  DisputeListResponse,
  DisputeNoteResponse,
  DisputeResponse,
  RejectApplication,
  ResolveDispute,
  RoleApplicationFilter,
  RoleApplicationListResponse,
  RoleApplicationRequest,
  RoleApplicationResponse,
  SuspendUser,
  UserSearchResponse,
} from "@techorbit/types";

export class AdminApiClient {
  constructor(private client: ApiClient) {}

  // Role applications
  submitApplication(data: RoleApplicationRequest): Promise<RoleApplicationResponse> {
    return this.client.post("/api/v1/role-applications", data);
  }
  listApplications(filter?: RoleApplicationFilter): Promise<RoleApplicationListResponse> {
    return this.client.get(`/api/v1/role-applications${qs(filter)}`);
  }
  getApplication(id: string): Promise<RoleApplicationResponse> {
    return this.client.get(`/api/v1/role-applications/${id}`);
  }
  approveApplication(id: string, data: ApproveApplication = {}): Promise<RoleApplicationResponse> {
    return this.client.post(`/api/v1/role-applications/${id}/approve`, data);
  }
  rejectApplication(id: string, data: RejectApplication): Promise<RoleApplicationResponse> {
    return this.client.post(`/api/v1/role-applications/${id}/reject`, data);
  }

  // Disputes
  createDispute(data: CreateDisputeRequest): Promise<DisputeResponse> {
    return this.client.post("/api/v1/disputes", data);
  }
  listDisputes(filter?: DisputeFilter): Promise<DisputeListResponse> {
    return this.client.get(`/api/v1/disputes${qs(filter)}`);
  }
  getDispute(id: string): Promise<DisputeResponse> {
    return this.client.get(`/api/v1/disputes/${id}`);
  }
  addDisputeNote(id: string, data: AddDisputeNote): Promise<DisputeNoteResponse> {
    return this.client.post(`/api/v1/disputes/${id}/notes`, data);
  }
  resolveDispute(id: string, data: ResolveDispute): Promise<DisputeResponse> {
    return this.client.post(`/api/v1/disputes/${id}/resolve`, data);
  }

  // User management
  suspendUser(userId: string, data: SuspendUser): Promise<{ ok: true }> {
    return this.client.post(`/api/v1/admin/users/${userId}/suspend`, data);
  }
  banUser(userId: string, data: BanUser): Promise<{ ok: true }> {
    return this.client.post(`/api/v1/admin/users/${userId}/ban`, data);
  }
  triggerPasswordReset(userId: string): Promise<{ ok: true }> {
    return this.client.post(`/api/v1/admin/users/${userId}/reset-password`, {});
  }
  searchUsers(q: string): Promise<UserSearchResponse> {
    return this.client.get(`/api/v1/admin/users/search?q=${encodeURIComponent(q)}`);
  }

  // Audit logs
  listAuditLogs(filter?: AuditLogFilter): Promise<AuditLogListResponse> {
    return this.client.get(`/api/v1/admin/audit-logs${qs(filter)}`);
  }

  // Dashboard
  getDashboardMetrics(): Promise<DashboardMetricsResponse> {
    return this.client.get("/api/v1/admin/dashboard/metrics");
  }
}

export function createAdminApiClient(client: ApiClient): AdminApiClient {
  return new AdminApiClient(client);
}

function qs(filter?: Record<string, unknown>): string {
  if (!filter) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filter)) {
    if (v === undefined || v === null) continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}
