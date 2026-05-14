import { InternalError } from "@techorbit/errors";
import type { ServiceTokenSigner } from "./service-token.js";

// Shape of candidates returned by profile-svc /api/v1/internal/candidates.
export type CandidateSummary = {
  id: string;
  userId: string;
  seniority: string | null;
  skills: string[];
  location: string | null;
  preferRemote: boolean;
  preferHybrid: boolean;
  preferOnsite: boolean;
  workAuthStatus: string | null;
  averageRating: number | null;
  isProfileComplete: boolean;
};

export type ProfileApi = {
  listCompleteCandidates(opts: {
    cursor?: string;
    limit?: number;
  }): Promise<{ data: CandidateSummary[]; nextCursor: string | null; hasMore: boolean }>;
  getCandidateByUserId(userId: string, bearerToken: string): Promise<CandidateSummary | null>;
  // Sprint 12 — S2S check: is this candidate / MSME in this SRM's APPROVED portfolio?
  hasApprovedPortfolioLink(opts: {
    srmUserId: string;
    memberUserId: string;
    memberType: "CANDIDATE" | "MSME";
  }): Promise<boolean>;
};

export function createProfileApi(
  profileSvcUrl: string,
  signer: ServiceTokenSigner,
): ProfileApi {
  async function serviceFetch(path: string): Promise<Response> {
    const token = await signer.getToken();
    try {
      return await fetch(`${profileSvcUrl}${path}`, {
        headers: { authorization: `Bearer ${token}` },
      });
    } catch (err) {
      throw new InternalError(
        `Failed to reach profile-svc at ${path}: ${(err as Error).message}`,
      );
    }
  }

  return {
    async listCompleteCandidates({ cursor, limit = 100 }) {
      const q = new URLSearchParams();
      if (cursor) q.set("cursor", cursor);
      q.set("limit", String(limit));
      const res = await serviceFetch(`/api/v1/internal/candidates?${q.toString()}`);
      if (!res.ok) {
        throw new InternalError(
          `profile-svc /internal/candidates returned ${res.status}`,
        );
      }
      const body = (await res.json()) as {
        data: CandidateSummary[];
        nextCursor: string | null;
        hasMore: boolean;
      };
      return body;
    },

    async hasApprovedPortfolioLink({ srmUserId, memberUserId, memberType }) {
      const q = new URLSearchParams({ srmUserId, memberUserId, memberType });
      const res = await serviceFetch(
        `/api/v1/internal/srm-portfolio/has-approved-link?${q.toString()}`,
      );
      if (!res.ok) {
        // Treat any non-200 as "no link" rather than failing the SRM's invite —
        // the user-facing error is "candidate not in your portfolio".
        return false;
      }
      const body = (await res.json()) as { hasLink: boolean };
      return body.hasLink === true;
    },

    async getCandidateByUserId(userId, bearerToken) {
      // Forwards the user's bearer token — profile-svc's own authz applies.
      // Used on the submission path (submitter is a user, not a service).
      let res: Response;
      try {
        res = await fetch(`${profileSvcUrl}/api/v1/candidates/${userId}`, {
          headers: { authorization: `Bearer ${bearerToken}` },
        });
      } catch (err) {
        throw new InternalError(
          `Failed to reach profile-svc: ${(err as Error).message}`,
        );
      }
      if (res.status === 404 || res.status === 403) return null;
      if (!res.ok) {
        throw new InternalError(
          `profile-svc /candidates/${userId} returned ${res.status}`,
        );
      }
      const body = (await res.json()) as Record<string, unknown>;
      return {
        id: String(body.id),
        userId: String(body.userId),
        seniority: (body.seniority as string | null) ?? null,
        skills: Array.isArray(body.skills) ? (body.skills as string[]) : [],
        location: (body.location as string | null) ?? null,
        preferRemote: Boolean(body.preferRemote),
        preferHybrid: Boolean(body.preferHybrid),
        preferOnsite: Boolean(body.preferOnsite),
        workAuthStatus: (body.workAuthStatus as string | null) ?? null,
        averageRating:
          body.averageRating == null ? null : Number(body.averageRating),
        isProfileComplete: Boolean(body.isProfileComplete),
      };
    },
  };
}
