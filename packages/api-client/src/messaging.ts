import type { ApiClient } from "./client.js";
import type {
  CreateThreadRequest,
  MessageResponse,
  SendMessageRequest,
  ThreadFilter,
  ThreadListResponse,
  ThreadWithMessagesResponse,
} from "@techorbit/types";

export class MessagingApiClient {
  constructor(private client: ApiClient) {}

  createThread(data: CreateThreadRequest): Promise<ThreadWithMessagesResponse> {
    return this.client.post("/api/v1/threads", data);
  }
  listThreads(filter?: ThreadFilter): Promise<ThreadListResponse> {
    return this.client.get(`/api/v1/threads${qs(filter)}`);
  }
  getThread(id: string): Promise<ThreadWithMessagesResponse> {
    return this.client.get(`/api/v1/threads/${id}`);
  }
  sendMessage(threadId: string, data: SendMessageRequest): Promise<MessageResponse> {
    return this.client.post(`/api/v1/threads/${threadId}/messages`, data);
  }
  markRead(threadId: string): Promise<{ updatedCount: number }> {
    return this.client.post(`/api/v1/threads/${threadId}/mark-read`, {});
  }
}

export function createMessagingApiClient(client: ApiClient): MessagingApiClient {
  return new MessagingApiClient(client);
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
