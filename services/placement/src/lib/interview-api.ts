import { InternalError } from "@techorbit/errors";
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

export function createInterviewApi(
  interviewSvcUrl: string,
  signer: ServiceTokenSigner,
): InterviewApi {
  return {
    async listCompletedForSubmission(submissionId) {
      const token = await signer.getToken();
      let res: Response;
      try {
        res = await fetch(
          `${interviewSvcUrl}/api/v1/internal/interviews?submissionId=${submissionId}&status=COMPLETED`,
          { headers: { authorization: `Bearer ${token}` } },
        );
      } catch (err) {
        throw new InternalError(`interview-svc unreachable: ${(err as Error).message}`);
      }
      if (!res.ok) throw new InternalError(`interview-svc returned ${res.status}`);
      const body = (await res.json()) as { data: InterviewRecord[] };
      return body.data;
    },
  };
}
