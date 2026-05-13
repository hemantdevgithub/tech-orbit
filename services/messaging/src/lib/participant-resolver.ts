import { InternalError, NotFoundError } from "@techorbit/errors";
import type { ThreadContextType } from "@techorbit/types";
import type { ServiceTokenSigner } from "./service-token.js";

// Resolves the set of userIds that should be allowed on a thread, given a
// context. Fails with NotFoundError when the context target does not exist.
// Each branch hits the owning service's /api/v1/internal/<resource>/:id endpoint.

export type ParticipantResolverDeps = {
  signer: ServiceTokenSigner;
  placementSvcUrl: string;
  requirementSvcUrl: string;
  matchingSvcUrl: string;
  interviewSvcUrl: string;
};

export type ResolvedParticipants = {
  participantIds: string[];
  // If true, the caller-supplied participantIds override the auto-resolved set.
  allowCustom: boolean;
};

export function createParticipantResolver(deps: ParticipantResolverDeps) {
  async function svcFetch(url: string): Promise<Response> {
    const token = await deps.signer.getToken();
    try {
      return await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    } catch (err) {
      throw new InternalError(`upstream unreachable: ${(err as Error).message}`);
    }
  }

  function dedupe(ids: Array<string | null | undefined>): string[] {
    return Array.from(new Set(ids.filter((v): v is string => typeof v === "string" && v.length > 0)));
  }

  return {
    async resolve(params: {
      contextType: ThreadContextType;
      contextId: string;
      callerUserId: string;
      suppliedParticipantIds?: string[];
    }): Promise<ResolvedParticipants> {
      const { contextType, contextId, callerUserId, suppliedParticipantIds } = params;

      if (contextType === "GENERAL") {
        const extra = suppliedParticipantIds ?? [];
        return {
          participantIds: dedupe([callerUserId, ...extra]),
          allowCustom: true,
        };
      }

      // For all domain contexts, the caller is always included. The upstream
      // lookup populates the other "primary" parties (candidate, customer user,
      // interviewer, etc.); the caller is added alongside so customers reaching
      // out about their own requirement/submission/interview end up on the thread.

      if (contextType === "PLACEMENT") {
        const res = await svcFetch(`${deps.placementSvcUrl}/api/v1/internal/placements/${contextId}`);
        if (res.status === 404) throw new NotFoundError("Placement not found");
        if (!res.ok) throw new InternalError(`placement-svc returned ${res.status}`);
        const p = (await res.json()) as { candidateId?: string; createdByUserId?: string };
        return {
          participantIds: dedupe([callerUserId, p.candidateId, p.createdByUserId]),
          allowCustom: false,
        };
      }

      if (contextType === "REQUIREMENT") {
        const res = await svcFetch(`${deps.requirementSvcUrl}/api/v1/internal/requirements/${contextId}`);
        if (res.status === 404) throw new NotFoundError("Requirement not found");
        if (!res.ok) throw new InternalError(`requirement-svc returned ${res.status}`);
        const r = (await res.json()) as { createdByUserId?: string };
        return {
          participantIds: dedupe([callerUserId, r.createdByUserId]),
          allowCustom: false,
        };
      }

      if (contextType === "SUBMISSION") {
        const res = await svcFetch(`${deps.matchingSvcUrl}/api/v1/internal/submissions/${contextId}`);
        if (res.status === 404) throw new NotFoundError("Submission not found");
        if (!res.ok) throw new InternalError(`matching-svc returned ${res.status}`);
        const s = (await res.json()) as {
          candidateId?: string;
          submittedByUserId?: string;
        };
        return {
          participantIds: dedupe([callerUserId, s.candidateId, s.submittedByUserId]),
          allowCustom: false,
        };
      }

      if (contextType === "INTERVIEW") {
        const res = await svcFetch(`${deps.interviewSvcUrl}/api/v1/internal/interviews/${contextId}`);
        if (res.status === 404) throw new NotFoundError("Interview not found");
        if (!res.ok) throw new InternalError(`interview-svc returned ${res.status}`);
        const i = (await res.json()) as {
          candidateId?: string;
          interviewerUserId?: string;
          scheduledByUserId?: string;
        };
        return {
          participantIds: dedupe([callerUserId, i.candidateId, i.interviewerUserId, i.scheduledByUserId]),
          allowCustom: false,
        };
      }

      throw new InternalError(`unsupported contextType: ${contextType satisfies never}`);
    },
  };
}

export type ParticipantResolver = ReturnType<typeof createParticipantResolver>;
