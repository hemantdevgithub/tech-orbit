import { InternalError } from "@techorbit/errors";
import type { ServiceTokenSigner } from "./service-token.js";

export type ProfileApi = {
  getCustomerByUserId(userId: string): Promise<{ id: string; primaryUserId: string } | null>;
};

export function createProfileApi(
  profileSvcUrl: string,
  signer: ServiceTokenSigner,
): ProfileApi {
  return {
    async getCustomerByUserId(userId) {
      const token = await signer.getToken();
      let res: Response;
      try {
        res = await fetch(`${profileSvcUrl}/api/v1/internal/customers/${userId}`, {
          headers: { authorization: `Bearer ${token}` },
        });
      } catch (err) {
        throw new InternalError(`profile-svc unreachable: ${(err as Error).message}`);
      }
      if (res.status === 404 || res.status === 403) return null;
      if (!res.ok) throw new InternalError(`profile-svc returned ${res.status}`);
      return (await res.json()) as { id: string; primaryUserId: string };
    },
  };
}
