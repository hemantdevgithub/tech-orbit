"use client";

import { usePathname } from "next/navigation";
import { NavBar } from "@techorbit/ui";
import { useAuthStore } from "@/store/auth.store";
import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";
import { AdminGuard } from "@/components/admin-guard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const pathname = usePathname() ?? "/admin";

  const navLinks = [
    { label: "Dashboard", href: "/admin", active: pathname === "/admin" },
    { label: "Role Applications", href: "/admin/role-applications", active: pathname.startsWith("/admin/role-applications") },
    { label: "Users", href: "/admin/users", active: pathname.startsWith("/admin/users") },
    { label: "Disputes", href: "/admin/disputes", active: pathname.startsWith("/admin/disputes") },
    { label: "Audit Logs", href: "/admin/audit-logs", active: pathname.startsWith("/admin/audit-logs") },
  ];

  return (
    <AdminGuard>
      <div className="min-h-screen bg-cream-50">
        <NavBar
          logoText="Techorbit Admin"
          userName={user ? `${user.firstName} ${user.lastName}` : undefined}
          links={navLinks}
          rightSlot={<NotificationBell />}
        userSlot={<UserMenu />}
        />
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">{children}</div>
      </div>
    </AdminGuard>
  );
}
