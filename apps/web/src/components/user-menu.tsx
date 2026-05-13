"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/lib/auth-hooks";
import { BellIcon, HomeIcon, ShieldIcon, UserIcon, ROLE_ICON_COMPONENT } from "@/components/icons";

const ROLE_LABEL: Record<string, string> = {
  CUSTOMER: "Customer",
  CANDIDATE: "Candidate",
  CRM: "Business Developer",
  SRM: "Recruiter",
  MSME: "Vendor Firm",
  ADMIN: "Admin",
};

export function UserMenu(): JSX.Element | null {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  if (!user) return null;

  const name = `${user.firstName} ${user.lastName}`.trim() || user.email;
  const initials = name
    ? name.split(" ").map((n) => n[0]).filter(Boolean).join("").slice(0, 2).toUpperCase()
    : "?";

  const activeRoles = (user.roles ?? []).filter((r) => r.status === "ACTIVE").map((r) => r.roleType);
  const primaryRole = activeRoles[0] ?? null;
  const isAdmin = activeRoles.includes("ADMIN");

  async function handleLogout() {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      router.replace("/login");
    }
  }

  const RoleIcon = primaryRole ? ROLE_ICON_COMPONENT[primaryRole] : null;

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Trigger — avatar + name + role */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="User menu"
        aria-expanded={open}
        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-sage-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-400"
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-sage-200 text-forest-800 text-sm font-bold flex items-center justify-center shrink-0">
          {initials}
        </div>
        {/* Name + role */}
        <div className="hidden md:block text-left">
          <p className="text-sm font-semibold text-forest-900 leading-tight max-w-[140px] truncate">{name}</p>
          {primaryRole && (
            <p className="text-xs text-sage-500 flex items-center gap-1 leading-tight mt-0.5">
              {RoleIcon && <RoleIcon size={11} />}
              {ROLE_LABEL[primaryRole]}
            </p>
          )}
        </div>
        {/* Chevron */}
        <svg
          className={`w-3.5 h-3.5 text-sage-400 transition-transform hidden md:block ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-cardHover border border-sage-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-sage-100">
            <div className="w-10 h-10 rounded-full bg-sage-200 text-forest-800 text-sm font-bold flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-forest-900 truncate">{name}</p>
              <p className="text-xs text-sage-500 truncate">{user.email}</p>
              {activeRoles.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {activeRoles.map((r) => (
                    <span key={r} className="px-2 py-0.5 rounded-full bg-sage-100 text-forest-700 text-[10px] font-semibold">
                      {ROLE_LABEL[r] ?? r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Links */}
          <ul className="py-1">
            <li><MenuLink href="/dashboard" onClick={() => setOpen(false)} Icon={HomeIcon} label="Dashboard" /></li>
            <li><MenuLink href="/settings/profile" onClick={() => setOpen(false)} Icon={UserIcon} label="Profile settings" /></li>
            <li><MenuLink href="/settings/notifications" onClick={() => setOpen(false)} Icon={BellIcon} label="Notification preferences" /></li>
            {isAdmin && (
              <li><MenuLink href="/admin" onClick={() => setOpen(false)} Icon={ShieldIcon} label="Admin console" /></li>
            )}
          </ul>

          {/* Sign out */}
          <div className="border-t border-sage-100 py-1">
            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-danger/5 disabled:opacity-50 transition-colors"
            >
              <span className="text-base">↪</span>
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  Icon,
  label,
  onClick,
}: {
  href: string;
  Icon: (p: { size?: number; className?: string }) => JSX.Element;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-forest-900 hover:bg-sage-50 transition-colors"
    >
      <span className="w-5 flex justify-center text-sage-500">
        <Icon size={15} />
      </span>
      {label}
    </Link>
  );
}
