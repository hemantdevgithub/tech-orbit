"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, status, accessToken } = useAuthStore();
  const router = useRouter();

  // Wait for zustand persist hydration before acting on auth state —
  // otherwise a hard reload bounces to /login before localStorage loads.
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated || status === "loading") return;
    if (!user && !accessToken) {
      router.replace("/login");
    }
  }, [hydrated, user, status, accessToken, router]);

  if (!hydrated) return null;
  if (!user && !accessToken) return null;

  return (
    <div className="min-h-screen bg-mint-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {children}
      </div>
    </div>
  );
}
