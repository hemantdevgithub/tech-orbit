"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { getAuthClient } from "@/lib/api-client";
import type { ApiError } from "@techorbit/api-client";

export function useAuth() {
  const store = useAuthStore();
  const router = useRouter();

  const login = useCallback(
    async (email: string, password: string) => {
      store.setStatus("loading");
      store.setError(null);

      try {
        const client = getAuthClient();
        const result = await client.login({ email, password });

        if (result.require2FA) {
          store.set2FAChallenge(result.challengeToken ?? "", result.expiresIn ?? 300);
          router.push("/verify-2fa");
          return;
        }

        if (result.accessToken) {
          store.setTokens(result.accessToken, result.expiresIn ?? 900);
          // Fetch user profile
          await fetchMe();
          router.push("/techforce/dashboard");
        }
      } catch (err) {
        const apiErr = err as ApiError;
        store.setError(apiErr.message ?? "Login failed");
        store.setStatus("unauthenticated");
        throw err;
      }
    },
    [router]
  );

  const register = useCallback(
    async (email: string, password: string, firstName: string, lastName: string) => {
      store.setStatus("loading");
      store.setError(null);

      try {
        const client = getAuthClient();
        await client.register({ email, password, firstName, lastName });
        router.push("/login?registered=true");
      } catch (err) {
        const apiErr = err as ApiError;
        store.setError(apiErr.message ?? "Registration failed");
        store.setStatus("unauthenticated");
        throw err;
      }
    },
    [router]
  );

  const verify2FA = useCallback(
    async (code: string) => {
      store.setStatus("loading");
      store.setError(null);

      try {
        const client = getAuthClient();
        const result = await client.verify2FA({
          code,
          challengeToken: store.challengeToken ?? undefined,
        });

        store.setTokens(result.accessToken, result.expiresIn);
        await fetchMe();
        router.push("/techforce/dashboard");
      } catch (err) {
        const apiErr = err as ApiError;
        store.setError(apiErr.message ?? "2FA verification failed");
        store.setStatus("requires2FA");
        throw err;
      }
    },
    [router]
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    store.setError(null);
    try {
      const client = getAuthClient();
      await client.requestPasswordReset({ email });
    } catch (err) {
      // Swallow errors for email enumeration prevention
      console.warn("Password reset request failed:", err);
    }
  }, []);

  const confirmPasswordReset = useCallback(
    async (token: string, password: string) => {
      store.setError(null);
      try {
        const client = getAuthClient();
        await client.confirmPasswordReset({ token, password });
        router.push("/login?reset=true");
      } catch (err) {
        const apiErr = err as ApiError;
        store.setError(apiErr.message ?? "Password reset failed");
        throw err;
      }
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      const client = getAuthClient();
      await client.logout();
    } catch {
      // Ignore logout errors — clear local state anyway
    } finally {
      store.logout();
      router.push("/login");
    }
  }, [router]);

  const fetchMe = useCallback(async () => {
    try {
      const client = getAuthClient();
      const me = await client.getMe();
      store.setUser(me);
    } catch {
      // Ignore — token may be expired
    }
  }, []);

  const clearError = useCallback(() => {
    store.setError(null);
  }, []);

  // Add a role then immediately refresh the access token so the new role
  // appears in the JWT without requiring a logout/re-login cycle.
  const addRole = useCallback(async (roleType: string) => {
    store.setError(null);
    try {
      const client = getAuthClient();
      const updatedUser = await client.addRole({ roleType });
      store.setUser(updatedUser);
      // Refresh the access token so the new role is in the JWT claims.
      const refreshed = await client.refreshToken();
      store.setTokens(refreshed.accessToken, refreshed.expiresIn);
    } catch (err) {
      const apiErr = err as ApiError;
      store.setError(apiErr.message ?? "Failed to add role");
      throw err;
    }
  }, []);

  return {
    ...store,
    login,
    register,
    verify2FA,
    requestPasswordReset,
    confirmPasswordReset,
    logout,
    fetchMe,
    addRole,
    clearError,
  };
}
