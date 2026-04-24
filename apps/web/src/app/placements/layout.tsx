"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { NavBar } from "@techorbit/ui";
import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/lib/auth-hooks";

export default function PlacementsLayout({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuthStore();
  const { fetchMe } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!user && status === "unauthenticated") router.replace("/login");
    else if (!user && status === "authenticated") void fetchMe();
  }, [user, status, router, fetchMe]);

  if (!user) return null;

  const activeRoles = user.roles.filter((r) => r.status === "ACTIVE");
  const navLinks = [
    { label: "Home", href: "/dashboard" },
    { label: "Requirements", href: "/requirements" },
    { label: "Placements", href: "/placements", active: true },
    ...(activeRoles.some((r) => ["CUSTOMER", "CANDIDATE", "INTERVIEWER"].includes(r.roleType))
      ? [{ label: "Interviews", href: "/interviews" }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-cream-50">
      <NavBar logoText="Techorbit" userName={`${user.firstName} ${user.lastName}`} links={navLinks} rightSlot={<NotificationBell />}
        userSlot={<UserMenu />} />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">{children}</div>
    </div>
  );
}
