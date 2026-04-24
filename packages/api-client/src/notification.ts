import type { ApiClient } from "./client.js";
import type {
  NotificationFilter,
  NotificationListResponse,
  NotificationPreferenceResponse,
  NotificationResponse,
  UpdateNotificationPreference,
} from "@techorbit/types";

export class NotificationApiClient {
  constructor(private client: ApiClient) {}

  list(filter?: NotificationFilter): Promise<NotificationListResponse> {
    return this.client.get(`/api/v1/notifications${qs(filter)}`);
  }
  markRead(id: string): Promise<NotificationResponse> {
    return this.client.post(`/api/v1/notifications/${id}/mark-read`, {});
  }
  markAllRead(): Promise<{ updatedCount: number }> {
    return this.client.post("/api/v1/notifications/mark-all-read", {});
  }
  getPreferences(): Promise<NotificationPreferenceResponse> {
    return this.client.get("/api/v1/notification-preferences");
  }
  updatePreferences(data: UpdateNotificationPreference): Promise<NotificationPreferenceResponse> {
    return this.client.put("/api/v1/notification-preferences", data);
  }
}

export function createNotificationApiClient(client: ApiClient): NotificationApiClient {
  return new NotificationApiClient(client);
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
