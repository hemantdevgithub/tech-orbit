import { ApiClient, createAuthApiClient } from "@techorbit/api-client";
import type { AuthApiClient } from "@techorbit/api-client";
import { useAuthStore } from "@/store/auth.store";

const IDENTITY_BASE_URL =
  process.env.NEXT_PUBLIC_IDENTITY_URL ?? "http://localhost:4001";

let apiClientInstance: ApiClient | null = null;
let authClientInstance: AuthApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!apiClientInstance) {
    const store = useAuthStore.getState();

    apiClientInstance = new ApiClient({
      baseUrl: IDENTITY_BASE_URL,
      getAccessToken: () => store.accessToken,
      onAccessTokenRefresh: (token) => {
        useAuthStore.getState().setTokens(token, 900); // 15 min default
      },
      onRefreshFailure: () => {
        useAuthStore.getState().logout();
        // Redirect to login on refresh failure
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      },
    });
  }
  return apiClientInstance;
}

export function getAuthClient(): AuthApiClient {
  if (!authClientInstance) {
    authClientInstance = createAuthApiClient(getApiClient());
  }
  return authClientInstance;
}

// Singleton reset for server-side / HMR
export function resetApiClient(): void {
  apiClientInstance = null;
  authClientInstance = null;
}
