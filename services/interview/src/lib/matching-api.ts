import { InternalError } from "@techorbit/errors";
import type { ServiceTokenSigner } from "./service-token.js";

export type SubmissionSummary = {
  id: string;
  requirementId: string;
  candidateId: string;
  submittedByUserId: string;
  status: string;
  matchScore: number | null;
};

export type MatchingApi = {
  getSubmission(id: string): Promise<SubmissionSummary | null>;
};

export function createMatchingApi(
  matchingSvcUrl: string,
  signer: ServiceTokenSigner,
): MatchingApi {
  return {
    async getSubmission(id) {
      const token = await signer.getToken();
      let res: Response;
      try {
        res = await fetch(`${matchingSvcUrl}/api/v1/internal/submissions/${id}`, {
          headers: { authorization: `Bearer ${token}` },
        });
      } catch (err) {
        throw new InternalError(`Failed to reach matching-svc: ${(err as Error).message}`);
      }
      if (res.status === 404) return null;
      if (!res.ok) throw new InternalError(`matching-svc returned ${res.status}`);
      const body = (await res.json()) as SubmissionSummary;
      return body;
    },
  };
}
