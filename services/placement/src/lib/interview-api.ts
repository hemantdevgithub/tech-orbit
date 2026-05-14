import type { ServiceTokenSigner } from "./service-token.js";

export type InterviewRecord = {
  id: string;
  submissionId: string;
  candidateId: string;
  interviewerUserId: string | null;
  status: string;
  interviewerFeeUsd: number | null;
};

export type InterviewApi = {
  listCompletedForSubmission(submissionId: string): Promise<InterviewRecord[]>;
};

// Sprint 12 cleanup — when interview-svc is unreachable or unconfigured,
// placement-svc treats it as "no interviews exist." This matches the
// post-Sprint-11 worldview where interviews happen externally (Zoom etc.)
// and don't enter the value chain. Returning [] means commission rules
// won't include INTERVIEWER rows, which is the correct behavior.
export function createNullInterviewApi(): InterviewApi {
  return {
    async listCompletedForSubmission() {
      return [];
    },
  };
}

export function createInterviewApi(
  interviewSvcUrl: string,
  signer: ServiceTokenSigner,
): InterviewApi {
  return {
    async listCompletedForSubmission(submissionId) {
      const token = await signer.getToken();
      try {
        const res = await fetch(
          `${interviewSvcUrl}/api/v1/internal/interviews?submissionId=${submissionId}&status=COMPLETED`,
          { headers: { authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return []; // treat any error as "no interviews"
        const body = (await res.json()) as { data: InterviewRecord[] };
        return body.data;
      } catch {
        // Network error / DNS failure / etc. — same fallback.
        return [];
      }
    },
  };
}
