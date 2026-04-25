import { InternalError, NotFoundError } from "@techorbit/errors";
import type { ServiceTokenSigner } from "./service-token.js";
import type { SuspendDuration, UserStatus, UserSearchResult } from "@techorbit/types";

export type IdentityApi = {
  addRole(userId: string, roleType: string): Promise<void>;
  activateRole(userId: string, roleType: string): Promise<void>;
  updateUserStatus(
    userId: string,
    status: "SUSPENDED" | "BANNED" | "ACTIVE",
    opts: { reason?: string; duration?: SuspendDuration; performedBy: string },
  ): Promise<void>;
  triggerPasswordReset(userId: string, performedBy: string): Promise<void>;
  searchUsers(query: string, limit?: number): Promise<UserSearchResult[]>;
  getUser(userId: string): Promise<{ id: string; email: string; firstName: string | null; lastName: string | null; status: UserStatus; roles: string[] } | null>;
};

export function createIdentityApi(
  baseUrl: string,
  signer: ServiceTokenSigner,
): IdentityApi {
  async function svcFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await signer.getToken();
    try {
      return await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          "content-type": "application/json",
          ...(init.headers ?? {}),
          authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      throw new InternalError(`identity-svc unreachable: ${(err as Error).message}`);
    }
  }

  return {
    async addRole(userId, roleType) {
      const res = await svcFetch(`/api/v1/internal/users/${userId}/roles`, {
        method: "POST",
        body: JSON.stringify({ roleType }),
      });
      if (res.status === 404) throw new NotFoundError("User not found");
      if (!res.ok) throw new InternalError(`identity-svc returned ${res.status}`);
    },

    async activateRole(userId, roleType) {
      const res = await svcFetch(`/api/v1/internal/users/${userId}/roles/activate`, {
        method: "POST",
        body: JSON.stringify({ roleType }),
      });
      if (res.status === 404) throw new NotFoundError("User not found");
      if (!res.ok) throw new InternalError(`identity-svc returned ${res.status}`);
    },

    async updateUserStatus(userId, status, opts) {
      const res = await svcFetch(`/api/v1/internal/users/${userId}/status`, {
        method: "POST",
        body: JSON.stringify({ status, ...opts }),
      });
      if (res.status === 404) throw new NotFoundError("User not found");
      if (!res.ok) throw new InternalError(`identity-svc returned ${res.status}`);
    },

    async triggerPasswordReset(userId, performedBy) {
      const res = await svcFetch(`/api/v1/internal/users/${userId}/trigger-password-reset`, {
        method: "POST",
        body: JSON.stringify({ performedBy }),
      });
      if (res.status === 404) throw new NotFoundError("User not found");
      if (!res.ok) throw new InternalError(`identity-svc returned ${res.status}`);
    },

    async searchUsers(query, limit = 50) {
      const q = new URLSearchParams({ q: query, limit: String(limit) });
      const res = await svcFetch(`/api/v1/internal/users/search?${q.toString()}`);
      if (!res.ok) throw new InternalError(`identity-svc returned ${res.status}`);
      const body = (await res.json()) as { data: UserSearchResult[] };
      return body.data;
    },

    async getUser(userId) {
      const res = await svcFetch(`/api/v1/internal/users/${userId}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new InternalError(`identity-svc returned ${res.status}`);
      return (await res.json()) as {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        status: UserStatus;
        roles: string[];
      };
    },
  };
}
