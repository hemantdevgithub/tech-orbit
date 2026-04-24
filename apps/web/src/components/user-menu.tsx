"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/lib/auth-hooks";

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
  const isAdmin = activeRoles.includes("ADMIN");

  async function handleLogout() {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      router.replace("/login");
    }
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="User menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-forest-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-300"
      >
        <div className="w-7 h-7 rounded-full bg-mint-300 text-forest-800 text-xs font-bold flex items-center justify-center shrink-0">
          {initials}
        </div>
        <span className="text-sm font-medium text-cream-200 hidden md:block max-w-[120px] truncate">
          {name}
        </span>
        <svg className="w-3 h-3 text-sage-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-surface rounded-xl shadow-cardHover border border-surface-border z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-border">
            <p className="text-sm font-semibold text-forest-900 truncate">{name}</p>
            <p className="text-xs text-sage-500 mt-0.5 truncate">{user.email}</p>
            {activeRoles.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {activeRoles.map((r) => (
                  <span key={r} className="px-2 py-0.5 rounded-full bg-forest-100 text-forest-700 text-[10px] font-semibold">
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>
          <ul className="py-1">
            <li>
              <MenuLink href="/settings/profile" onClick={() => setOpen(false)} icon="👤" label="Profile" />
            </li>
            <li>
              <MenuLink href="/settings/notifications" onClick={() => setOpen(false)} icon="🔔" label="Notification preferences" />
            </li>
            {isAdmin && (
              <li>
                <MenuLink href="/admin" onClick={() => setOpen(false)} icon="🛡" label="Admin console" />
              </li>
            )}
            <li>
              <MenuLink href="/dashboard" onClick={() => setOpen(false)} icon="🏠" label="Dashboard" />
            </li>
          </ul>
          <div className="border-t border-surface-border py-1">
            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-danger hover:bg-danger/5 disabled:opacity-50"
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

function MenuLink({ href, icon, label, onClick }: { href: string; icon: string; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2 text-sm text-forest-900 hover:bg-cream-50"
    >
      <span className="text-base w-5 text-center">{icon}</span>
      {label}
    </Link>
  );
}
