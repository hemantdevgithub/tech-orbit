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
    ...(activeRoles.some((r) => r.roleType === "CUSTOMER")
      ? [{ label: "Requirements", href: "/requirements" }]
      : []),
    ...(activeRoles.some((r) => r.roleType === "CANDIDATE")
      ? [{ label: "Opportunities", href: "/opportunities" }]
      : []),
    ...(activeRoles.some((r) => r.roleType === "CRM" || r.roleType === "SRM")
      ? [{ label: "My Pipeline", href: "/pipeline" }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-cream-100">
      <NavBar
        logoText="Techorbit"
        userName={user ? `${user.firstName} ${user.lastName}` : undefined}
        links={navLinks}
        notificationCount={3}
      />

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-8">
        {children}
      </main>
    </div>
  );
}