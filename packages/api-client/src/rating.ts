import type { ApiClient } from "./client.js";
import type {
  RatingFilter,
  RatingListResponse,
  RatingResponse,
  SubmitRatingRequest,
} from "@techorbit/types";

export class RatingApiClient {
  constructor(private client: ApiClient) {}

  submit(data: SubmitRatingRequest): Promise<RatingResponse> {
    return this.client.post("/api/v1/ratings", data);
  }
  list(filter: RatingFilter): Promise<RatingListResponse> {
    return this.client.get(`/api/v1/ratings${qs(filter)}`);
  }
}

export function createRatingApiClient(client: ApiClient): RatingApiClient {
  return new RatingApiClient(client);
}

function qs(filter: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filter)) {
    if (v === undefined || v === null) continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}
