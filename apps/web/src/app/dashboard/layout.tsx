"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NavBar } from "@techorbit/ui";
import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/lib/auth-hooks";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const store = useAuthStore();
  const { fetchMe } = useAuth();
  const router = useRouter();

  // Zustand persist rehydrates from localStorage after the first render. Until
  // that finishes, store.status reads "unauthenticated" even for a logged-in
  // user, which would bounce them to /login on every hard reload. Track
  // hydration explicitly and skip the guard until we know we're reading real
  // state.
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (store.status === "unauthenticated") {
      router.replace("/login");
    } else if (!store.user && store.accessToken) {
      void fetchMe();
    }
  }, [hydrated, store.status, store.user, store.accessToken, router, fetchMe]);

  if (!hydrated) return null;
  if (store.status === "requires2FA") return null;
  if (store.status === "unauthenticated") return null;

  const user = store.user;
  // Pending-verification roles get nav too — their workspace renders on the
  // dashboard, so they need the links to navigate around it.
  const navRoles =
    user?.roles?.filter(
      (r) => r.status === "ACTIVE" || r.status === "PENDING_VERIFICATION",
    ) ?? [];

  const navLinks = [
    { label: "Home", href: "/dashboard", active: true },
    ...(navRoles.some((r) => ["CUSTOMER", "CANDIDATE", "SRM", "CRM", "MSME"].includes(r.roleType))
      ? [{ label: "Requirements", href: "/requirements" }]
      : []),
    ...(navRoles.some((r) => ["CUSTOMER", "CANDIDATE", "INTERVIEWER"].includes(r.roleType))
      ? [{ label: "Interviews", href: "/interviews" }]
      : []),
    ...(navRoles.some((r) => ["CUSTOMER", "CANDIDATE", "CRM", "SRM", "MSME"].includes(r.roleType))
      ? [{ label: "Placements", href: "/placements" }]
      : []),
    ...(navRoles.some((r) => ["CUSTOMER", "CRM"].includes(r.roleType))
      ? [{ label: "Interviewers", href: "/interviewers" }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-cream-50">
      <NavBar
        logoText="Techorbit"
        userName={user ? `${user.firstName} ${user.lastName}` : undefined}
        links={navLinks}
        rightSlot={<NotificationBell />}
        userSlot={<UserMenu />}
      />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {children}
      </main>
    </div>
  );
}