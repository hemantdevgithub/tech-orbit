"use client";

import { NavBar } from "@techorbit/ui";
import { useAuthStore } from "@/store/auth.store";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";

export default function CandidatesLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const { ready } = useAuthGuard();

  if (!ready) return null;

  const navLinks = [
    { label: "Home", href: "/dashboard" },
    { label: "Requirements", href: "/requirements" },
    { label: "Messages", href: "/messages" },
    { label: "Notifications", href: "/notifications" },
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
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">{children}</div>
    </div>
  );
}
