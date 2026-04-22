import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserProfile } from "@techorbit/types";

export type AuthStatus = "unauthenticated" | "loading" | "authenticated" | "requires2FA";

export interface AuthState {
  status: AuthStatus;
  user: UserProfile | null;
  accessToken: string | null;
  challengeToken: string | null;
  challengeExpiresAt: number | null;
  error: string | null;

  // Actions
  setUser: (user: UserProfile | null) => void;
  setTokens: (accessToken: string, expiresIn: number) => void;
  set2FAChallenge: (challengeToken: string, expiresIn: number) => void;
  setError: (error: string | null) => void;
  setStatus: (status: AuthStatus) => void;
  logout: () => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      status: "unauthenticated",
      user: null,
      accessToken: null,
      challengeToken: null,
      challengeExpiresAt: null,
      error: null,

      setUser: (user) => set({ user, status: user ? "authenticated" : "unauthenticated" }),

      setTokens: (accessToken) => set({ accessToken, status: "authenticated", error: null }),

      set2FAChallenge: (challengeToken, expiresIn) =>
        set({
          challengeToken,
          challengeExpiresAt: Date.now() + expiresIn * 1000,
          status: "requires2FA",
          error: null,
        }),

      setError: (error) => set({ error }),

      setStatus: (status) => set({ status }),

      logout: () =>
        set({
          status: "unauthenticated",
          user: null,
          accessToken: null,
          challengeToken: null,
          challengeExpiresAt: null,
          error: null,
        }),

      reset: () =>
        set({
          status: "unauthenticated",
          user: null,
          accessToken: null,
          challengeToken: null,
          challengeExpiresAt: null,
          error: null,
        }),
    }),
    {
      name: "techorbit-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        status: state.status === "authenticated" ? "authenticated" : "unauthenticated",
      }),
    }
  )
);

// Selector helpers
export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.status === "authenticated";
export const selectIsLoading = (state: AuthState) => state.status === "loading";
export const selectRequires2FA = (state: AuthState) => state.status === "requires2FA";
export const selectRoles = (state: AuthState) => state.user?.roles ?? [];
export const selectActiveRoles = (state: AuthState) =>
  state.user?.roles.filter((r) => r.status === "ACTIVE") ?? [];
