import { InternalError } from "@techorbit/errors";
import type { ServiceTokenSigner } from "./service-token.js";

// Sprint 12 — identity-svc S2S client. Used to fan out
// REQUIREMENT_PUBLISHED to every user with the CRM role.

export type UserSummary = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

export type IdentityApi = {
  listUsersByRole(opts: {
    role: "CUSTOMER" | "CANDIDATE" | "CRM" | "SRM" | "MSME" | "INTERVIEWER" | "ADMIN";
    cursor?: string;
    limit?: number;
  }): Promise<{ data: UserSummary[]; nextCursor: string | null; hasMore: boolean }>;
};

export function createIdentityApi(
  identitySvcUrl: string,
  signer: ServiceTokenSigner,
): IdentityApi {
  async function serviceFetch(path: string): Promise<Response> {
    const token = await signer.getToken();
    try {
      return await fetch(`${identitySvcUrl}${path}`, {
        headers: { authorization: `Bearer ${token}` },
      });
    } catch (err) {
      throw new InternalError(
        `Failed to reach identity-svc at ${path}: ${(err as Error).message}`,
      );
    }
  }

  return {
    async listUsersByRole({ role, cursor, limit = 200 }) {
      const q = new URLSearchParams();
      q.set("role", role);
      q.set("limit", String(limit));
      if (cursor) q.set("cursor", cursor);
      const res = await serviceFetch(`/api/v1/internal/users/by-role?${q.toString()}`);
      if (!res.ok) {
        throw new InternalError(
          `identity-svc /internal/users/by-role returned ${res.status}`,
        );
      }
      const body = (await res.json()) as {
        data: UserSummary[];
        nextCursor: string | null;
        hasMore: boolean;
      };
      return body;
    },
  };
}

// Helper for consumers: page through every CRM and call `fn` once per user.
export async function forEachUserWithRole(
  api: IdentityApi,
  role: "CRM" | "SRM" | "MSME" | "CANDIDATE" | "CUSTOMER" | "ADMIN" | "INTERVIEWER",
  fn: (user: UserSummary) => Promise<void> | void,
): Promise<void> {
  let cursor: string | undefined;
  // Pagination guard: never spin more than 50 pages of 200 (i.e. 10k users).
  for (let i = 0; i < 50; i++) {
    const page = await api.listUsersByRole({ role, cursor, limit: 200 });
    for (const user of page.data) {
      await fn(user);
    }
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
}
