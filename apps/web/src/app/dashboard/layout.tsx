"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { NavBar } from "@techorbit/ui";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/lib/auth-hooks";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const store = useAuthStore();
  const { fetchMe } = useAuth();
  const router = useRouter();

  // Fetch user on mount if not loaded
  useEffect(() => {
    if (store.status === "unauthenticated") {
      router.replace("/login");
    } else if (!store.user && store.accessToken) {
      void fetchMe();
    }
  }, [store.status, store.user, store.accessToken, router, fetchMe]);

  if (store.status === "unauthenticated" || store.status === "requires2FA") {
    return null;
  }

  const user = store.user;
  const activeRoles = user?.roles.filter((r) => r.status === "ACTIVE") ?? [];

  const navLinks = [
    { label: "Home", href: "/dashboard", active: true },
    ...(activeRoles.some((r) => ["CUSTOMER", "CANDIDATE", "SRM", "CRM", "MSME"].includes(r.roleType))
      ? [{ label: "Requirements", href: "/requirements" }]
      : []),
    ...(activeRoles.some((r) => ["CUSTOMER", "CANDIDATE", "INTERVIEWER"].includes(r.roleType))
      ? [{ label: "Interviews", href: "/interviews" }]
      : []),
    ...(activeRoles.some((r) => ["CUSTOMER", "CRM"].includes(r.roleType))
      ? [{ label: "Interviewers", href: "/interviewers" }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-cream-50">
      <NavBar
        logoText="Techorbit"
        userName={user ? `${user.firstName} ${user.lastName}` : undefined}
        links={navLinks}
        notificationCount={3}
      />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {children}
      </main>
    </div>
  );
}