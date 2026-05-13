"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "./auth-hooks";

type AuthGuardState = {
  hydrated: boolean;
  ready: boolean;
};

/**
 * Protects an authenticated route. Zustand persist rehydrates from
 * localStorage after the first render, so any guard that reads the store
 * immediately sees `unauthenticated` even for a logged-in user on hard
 * reload — the naive guard bounces to /login every time. This hook waits
 * for hydration, then redirects only if both user and token are absent.
 *
 * Returns:
 *   - hydrated: zustand persist has finished (initial render is safe to skip).
 *   - ready: hydrated AND we have a user OR a token (so it's safe to render).
 */
export function useAuthGuard(): AuthGuardState {
  const { user, status, accessToken } = useAuthStore();
  const { fetchMe } = useAuth();
  const router = useRouter();

  // useState's initializer runs on the server during the first RSC render
  // too, where zustand-persist isn't attached and `.persist` is undefined.
  // Start as not-hydrated; the effect below promotes after client mount.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !useAuthStore.persist) return;
    const unsub = useAuthStore.persist.onFinishHydration(() =>
      setHydrated(true),
    );
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (status === "loading" || status === "requires2FA") return;
    if (!user && !accessToken) {
      router.replace("/login");
      return;
    }
    if (!user && accessToken) {
      void fetchMe();
    }
  }, [hydrated, status, user, accessToken, router, fetchMe]);

  const ready = hydrated && (!!user || !!accessToken);
  return { hydrated, ready };
}
