import type { ApiClient } from "./client.js";
import type {
  CancelInterview,
  InterviewFilter,
  InterviewListResponse,
  InterviewResponse,
  ScorecardRequest,
  ScorecardResponse,
  ScheduleInterviewRequest,
} from "@techorbit/types";

export class InterviewApiClient {
  constructor(private client: ApiClient) {}

  schedule(data: ScheduleInterviewRequest): Promise<InterviewResponse> {
    return this.client.post("/api/v1/interviews", data);
  }

  list(filters?: InterviewFilter): Promise<InterviewListResponse> {
    const q = filters ? toQueryString(filters) : "";
    return this.client.get(`/api/v1/interviews${q}`);
  }

  getById(id: string): Promise<InterviewResponse> {
    return this.client.get(`/api/v1/interviews/${id}`);
  }

  start(id: string): Promise<InterviewResponse> {
    return this.client.post(`/api/v1/interviews/${id}/start`, {});
  }

  end(id: string): Promise<InterviewResponse> {
    return this.client.post(`/api/v1/interviews/${id}/end`, {});
  }

  cancel(id: string, data: CancelInterview): Promise<InterviewResponse> {
    return this.client.post(`/api/v1/interviews/${id}/cancel`, data);
  }

  submitScorecard(data: ScorecardRequest): Promise<ScorecardResponse> {
    return this.client.post("/api/v1/scorecards", data);
  }

  getScorecard(interviewId: string): Promise<ScorecardResponse> {
    return this.client.get(`/api/v1/scorecards?interviewId=${interviewId}`);
  }
}

export function createInterviewApiClient(client: ApiClient): InterviewApiClient {
  return new InterviewApiClient(client);
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
