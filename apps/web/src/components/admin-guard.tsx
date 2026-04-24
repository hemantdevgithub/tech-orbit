"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/lib/auth-hooks";

// Gates all /admin/* routes. Non-ADMIN users are bounced to /dashboard.
// Rendered at the top of the admin layout.
export function AdminGuard({ children }: { children: React.ReactNode }): JSX.Element | null {
  const { user, status } = useAuthStore();
  const { fetchMe } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!user && status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (!user && status === "authenticated") {
      void fetchMe();
      return;
    }
    if (user && !user.roles.some((r) => r.roleType === "ADMIN")) {
      router.replace("/dashboard");
    }
  }, [user, status, router, fetchMe]);

  if (!user) return null;
  if (!user.roles.some((r) => r.roleType === "ADMIN")) return null;

  return <>{children}</>;
}
