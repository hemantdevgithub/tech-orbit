import type { InterviewSummary } from "@techorbit/types";
import { InternalError } from "@techorbit/errors";
import type { ServiceTokenSigner } from "./service-token.js";

export type InterviewApi = {
  getSummaries(ids: string[], candidateId?: string): Promise<InterviewSummary[]>;
};

// When INTERVIEW_SVC_URL is not configured or JWT signer is missing, the
// API degrades to an empty-results stub. Lets profile-svc run in isolation
// during tests or when interview-svc is intentionally offline.
export function createNullInterviewApi(): InterviewApi {
  return { async getSummaries() { return []; } };
}

export function createInterviewApi(
  interviewSvcUrl: string,
  signer: ServiceTokenSigner,
): InterviewApi {
  return {
    async getSummaries(ids, candidateId) {
      if (ids.length === 0) return [];
      const token = await signer.getToken();
      const params = new URLSearchParams({ ids: ids.join(",") });
      if (candidateId) params.set("candidateId", candidateId);

      let res: Response;
      try {
        res = await fetch(
          `${interviewSvcUrl}/api/v1/internal/interviews/summaries?${params.toString()}`,
          { headers: { authorization: `Bearer ${token}` } },
        );
      } catch (err) {
        throw new InternalError(
          `Failed to reach interview-svc: ${(err as Error).message}`,
        );
      }
      if (!res.ok) {
        throw new InternalError(`interview-svc returned ${res.status}`);
      }
      const body = (await res.json()) as { data: InterviewSummary[] };
      return body.data ?? [];
    },
  };
}
