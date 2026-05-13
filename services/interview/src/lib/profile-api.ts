import { InternalError } from "@techorbit/errors";
import type { ServiceTokenSigner } from "./service-token.js";

export type InterviewerSummary = {
  id: string;
  userId: string;
  displayName: string | null;
  headline: string | null;
  specializations: string[];
  seniorityLevels: string[];
  interviewTypes: string[];
  feePerInterviewUsd: number | null;
  averageRating: number | null;
  isVerified: boolean;
  availabilityPattern: AvailabilityPattern | null;
};

export type AvailabilityPattern = {
  daysOfWeek: number[];    // 0 = Sunday … 6 = Saturday
  startHour: number;       // 0–23 UTC
  endHour: number;
};

export type ProfileApi = {
  getInterviewer(userId: string): Promise<InterviewerSummary | null>;
  listInterviewers(query: {
    specializations?: string[];
    limit?: number;
    cursor?: string;
  }): Promise<{ data: InterviewerSummary[]; nextCursor: string | null; hasMore: boolean }>;
  // Re-use: also used for customer lookups in requirement-svc
  getCustomerByUserId(userId: string): Promise<{ id: string; primaryUserId: string } | null>;
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
      throw new InternalError(`profile-svc unreachable: ${(err as Error).message}`);
    }
  }

  return {
    async getInterviewer(userId) {
      const res = await serviceFetch(`/api/v1/interviewers/${userId}`);
      if (res.status === 404 || res.status === 403) return null;
      if (!res.ok) throw new InternalError(`profile-svc /interviewers/${userId} → ${res.status}`);
      const body = (await res.json()) as Record<string, unknown>;
      return {
        id: String(body.id),
        userId: String(body.userId),
        displayName: (body.displayName as string | null) ?? null,
        headline: (body.headline as string | null) ?? null,
        specializations: Array.isArray(body.specializations) ? (body.specializations as string[]) : [],
        seniorityLevels: Array.isArray(body.seniorityLevels) ? (body.seniorityLevels as string[]) : [],
        interviewTypes: Array.isArray(body.interviewTypes) ? (body.interviewTypes as string[]) : [],
        feePerInterviewUsd: body.feePerInterviewUsd == null ? null : Number(body.feePerInterviewUsd),
        averageRating: body.averageRating == null ? null : Number(body.averageRating),
        isVerified: Boolean(body.isVerified),
        availabilityPattern: (body.availabilityPattern as AvailabilityPattern | null) ?? null,
      };
    },

    async listInterviewers({ specializations, limit = 20, cursor }) {
      const q = new URLSearchParams();
      if (specializations?.length) q.set("specializations", specializations.join(","));
      if (limit) q.set("limit", String(limit));
      if (cursor) q.set("cursor", cursor);
      const res = await serviceFetch(`/api/v1/interviewers?${q.toString()}`);
      if (!res.ok) throw new InternalError(`profile-svc /interviewers → ${res.status}`);
      const body = (await res.json()) as {
        data: InterviewerSummary[];
        nextCursor: string | null;
        hasMore: boolean;
      };
      return body;
    },

    async getCustomerByUserId(userId) {
      const res = await serviceFetch(`/api/v1/internal/customers/${userId}`);
      if (res.status === 404 || res.status === 403) return null;
      if (!res.ok) return null;
      const body = (await res.json()) as { id: string; primaryUserId: string };
      return body;
    },
  };
}
