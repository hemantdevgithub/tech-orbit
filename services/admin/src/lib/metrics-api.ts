import type { ServiceTokenSigner } from "./service-token.js";

// Best-effort cross-service metrics collector. Any service call that fails
// returns the safe default (0) so the dashboard still renders. Each upstream
// is expected to expose a single /api/v1/internal/metrics endpoint returning
// a { value: number } payload — these endpoints are minimal and idempotent.

export type MetricsApi = {
  getActiveUsers(): Promise<number>;
  getTotalPlacements(): Promise<number>;
  getGmvThisMonthUsd(): Promise<number>;
};

export function createMetricsApi(
  signer: ServiceTokenSigner,
  urls: { identity: string; placement: string; payments: string },
): MetricsApi {
  async function tryFetch(url: string): Promise<number> {
    try {
      const token = await signer.getToken();
      const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
      if (!res.ok) return 0;
      const body = (await res.json()) as { value?: number };
      return typeof body.value === "number" ? body.value : 0;
    } catch {
      return 0;
    }
  }

  return {
    async getActiveUsers() {
      return tryFetch(`${urls.identity}/api/v1/internal/metrics/active-users`);
    },
    async getTotalPlacements() {
      return tryFetch(`${urls.placement}/api/v1/internal/metrics/total-placements`);
    },
    async getGmvThisMonthUsd() {
      return tryFetch(`${urls.payments}/api/v1/internal/metrics/gmv-this-month`);
    },
  };
}
