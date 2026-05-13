"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useAuthGuard } from "@/lib/use-auth-guard";

// Gates all /admin/* routes. Non-ADMIN users are bounced to /dashboard.
// Rendered at the top of the admin layout. Defers all auth checks until
// zustand-persist has hydrated — otherwise a hard reload sees user=null
// for one tick and bounces every admin to /login.
export function AdminGuard({ children }: { children: React.ReactNode }): JSX.Element | null {
  const { ready } = useAuthGuard();
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!ready || !user) return;
    if (!user.roles.some((r) => r.roleType === "ADMIN")) {
      router.replace("/techforce/dashboard");
    }
  }, [ready, user, router]);

  if (!ready || !user) return null;
  if (!user.roles.some((r) => r.roleType === "ADMIN")) return null;

  return <>{children}</>;
}
