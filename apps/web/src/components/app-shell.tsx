"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";
import {
  ArrowRightIcon,
  BellIcon,
  BriefcaseIcon,
  ClockIcon,
  DollarIcon,
  HandshakeIcon,
  HomeIcon,
  MenuIcon,
  MessageIcon,
  PlusIcon,
  ReceiptIcon,
  SearchIcon,
  ShieldIcon,
  UsersIcon,
  XIcon,
} from "@/components/icons";

type RoleType = "CUSTOMER" | "CANDIDATE" | "CRM" | "SRM" | "MSME" | "ADMIN";
type IconComp = (p: { size?: number; className?: string }) => JSX.Element;

// Primary CTA per role — the single most common action that role takes.
type Cta = { label: string; href: string; Icon: IconComp };
const PRIMARY_CTA: Partial<Record<RoleType, Cta>> = {
  CUSTOMER: { label: "Post a requirement", href: "/techforce/requirements/new", Icon: PlusIcon },
  CANDIDATE: { label: "View invitations", href: "/techforce/invitations", Icon: ArrowRightIcon },
  // Sprint 12 — CRM/SRM CTAs lead to the new Opportunity Portal entry.
  CRM: { label: "Accept a requirement", href: "/techforce/opportunity-portal", Icon: ArrowRightIcon },
  SRM: { label: "See your assignments", href: "/techforce/opportunity-portal", Icon: ArrowRightIcon },
  MSME: { label: "Submit a consultant", href: "/techforce/requirements", Icon: ArrowRightIcon },
  ADMIN: { label: "Admin console", href: "/techforce/admin", Icon: ShieldIcon },
};

type NavItem = { label: string; href: string; Icon: IconComp; roles: RoleType[] };
const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/techforce/dashboard", Icon: HomeIcon, roles: ["CUSTOMER", "CANDIDATE", "CRM", "SRM", "MSME", "ADMIN"] },
  // Sprint 12 — Opportunity Portal is the CRM/SRM entry for the new workflow.
  { label: "Opportunity Portal", href: "/techforce/opportunity-portal", Icon: BriefcaseIcon, roles: ["CRM", "SRM", "MSME"] },
  { label: "Requirements", href: "/techforce/requirements", Icon: BriefcaseIcon, roles: ["CUSTOMER", "CANDIDATE"] },
  // Sprint 12 — SRM roster (two-sided portfolio).
  { label: "Roster", href: "/techforce/roster", Icon: UsersIcon, roles: ["SRM"] },
  // Sprint 12 — Candidate invitations inbox.
  { label: "Invitations", href: "/techforce/invitations", Icon: HandshakeIcon, roles: ["CANDIDATE"] },
  { label: "Placements", href: "/techforce/placements", Icon: HandshakeIcon, roles: ["CUSTOMER", "CANDIDATE", "CRM", "SRM", "MSME"] },
  { label: "Timesheets", href: "/techforce/timesheets", Icon: ClockIcon, roles: ["CUSTOMER", "CANDIDATE"] },
  { label: "Invoices", href: "/techforce/invoices", Icon: ReceiptIcon, roles: ["CUSTOMER"] },
  { label: "Payouts", href: "/techforce/payouts", Icon: DollarIcon, roles: ["CANDIDATE", "CRM", "SRM", "MSME"] },
  { label: "Messages", href: "/techforce/messages", Icon: MessageIcon, roles: ["CUSTOMER", "CANDIDATE", "CRM", "SRM", "MSME", "ADMIN"] },
  { label: "Notifications", href: "/techforce/notifications", Icon: BellIcon, roles: ["CUSTOMER", "CANDIDATE", "CRM", "SRM", "MSME", "ADMIN"] },
];

// Three search prompts per role. Each submits to a list page with ?search=X.
type SearchField = { placeholder: string; href: string };
const SEARCH_FIELDS: Record<RoleType, SearchField[]> = {
  CUSTOMER: [
    { placeholder: "Find a requirement", href: "/techforce/requirements" },
    { placeholder: "Find a placement", href: "/techforce/placements" },
  ],
  CANDIDATE: [
    { placeholder: "Find a job", href: "/techforce/requirements" },
    { placeholder: "Find a placement", href: "/techforce/placements" },
  ],
  CRM: [
    { placeholder: "Find a requirement", href: "/techforce/requirements" },
    { placeholder: "Find a placement", href: "/techforce/placements" },
  ],
  SRM: [
    { placeholder: "Find a job", href: "/techforce/requirements" },
    { placeholder: "Find a submission", href: "/techforce/placements" },
  ],
  MSME: [
    { placeholder: "Find a job", href: "/techforce/requirements" },
    { placeholder: "Find a submission", href: "/techforce/placements" },
    { placeholder: "Find a placement", href: "/techforce/placements" },
  ],
  ADMIN: [
    { placeholder: "Find a user", href: "/techforce/admin/users" },
    { placeholder: "Find a dispute", href: "/techforce/admin/disputes" },
    { placeholder: "Find a role application", href: "/techforce/admin/role-applications" },
  ],
};

function pickPrimaryRole(roles: { roleType: string; status: string }[]): RoleType | null {
  // Prefer ACTIVE over PENDING_VERIFICATION; within that, use the first one.
  const active = roles.find((r) => r.status === "ACTIVE");
  if (active) return active.roleType as RoleType;
  const pending = roles.find((r) => r.status === "PENDING_VERIFICATION");
  if (pending) return pending.roleType as RoleType;
  return null;
}

function SearchRow({ field }: { field: SearchField }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  function submit() {
    const trimmed = value.trim();
    const url = trimmed ? `${field.href}?search=${encodeURIComponent(trimmed)}` : field.href;
    router.push(url);
  }
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400 pointer-events-none">
        <SearchIcon size={14} />
      </span>
      <input
        type="text"
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        className="w-full pl-9 pr-3 py-2 rounded-lg bg-forest-700/40 text-cream-100 placeholder-sage-400 text-sm border border-forest-700 hover:border-forest-600 focus:border-mint-300 focus:outline-none transition-colors"
      />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready } = useAuthGuard();
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const roles = useMemo(
    () =>
      (user?.roles ?? []).filter(
        (r) => r.status === "ACTIVE" || r.status === "PENDING_VERIFICATION",
      ),
    [user?.roles],
  );

  const primaryRole = useMemo(() => pickPrimaryRole(user?.roles ?? []), [user?.roles]);
  const cta = primaryRole ? PRIMARY_CTA[primaryRole] : null;
  const searchFields = primaryRole ? SEARCH_FIELDS[primaryRole] : [];

  const navItems = useMemo(() => {
    const roleTypes = roles.map((r) => r.roleType as RoleType);
    return NAV_ITEMS.filter((n) => n.roles.some((r) => roleTypes.includes(r)));
  }, [roles]);

  if (!ready) return null;

  const sidebar = (
    <aside className="w-64 shrink-0 bg-forest-800 text-cream-100 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <Link
        href="/techforce/dashboard"
        className="flex items-center gap-2.5 px-5 h-14 border-b border-forest-700/60 shrink-0"
      >
        <div className="w-8 h-8 rounded-lg bg-mint-200 flex items-center justify-center font-bold text-forest-800 text-sm">
          T
        </div>
        <div className="leading-tight">
          <p className="text-[10px] uppercase tracking-widest text-sage-400 font-semibold">
            TechOrbit
          </p>
          <p className="text-[14px] font-semibold tracking-tight">TechForce</p>
        </div>
      </Link>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto py-4 space-y-6">
        {/* Primary CTA */}
        {cta && (
          <div className="px-4">
            <Link
              href={cta.href}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-mint-300 text-forest-900 text-sm font-semibold hover:bg-mint-200 transition-colors"
            >
              <cta.Icon size={16} />
              <span>{cta.label}</span>
            </Link>
          </div>
        )}

        {/* Search */}
        {searchFields.length > 0 && (
          <div className="px-4 space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-sage-500 font-semibold px-1">
              Quick search
            </p>
            {searchFields.map((f) => (
              <SearchRow key={f.placeholder} field={f} />
            ))}
          </div>
        )}

        {/* Nav links */}
        <nav className="px-2">
          <p className="text-[11px] uppercase tracking-wider text-sage-500 font-semibold px-3 mb-2">
            Navigate
          </p>
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/techforce/dashboard" && pathname?.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      active
                        ? "bg-forest-700 text-cream-100 font-medium"
                        : "text-sage-300 hover:text-cream-100 hover:bg-forest-700/60"
                    }`}
                  >
                    <span className="shrink-0">
                      <item.Icon size={16} />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

    </aside>
  );

  return (
    <div className="min-h-screen bg-cream-50 flex">
      {/* Desktop sidebar (always visible at md+) */}
      <div className="hidden md:block">{sidebar}</div>

      {/* Mobile drawer */}
      <div
        className={`md:hidden fixed inset-0 bg-black/40 z-40 transition-opacity duration-200 motion-reduce:transition-none ${
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 motion-reduce:transition-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="relative">
          {sidebar}
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute top-3 right-3 p-2 rounded-md text-sage-300 hover:text-cream-100 hover:bg-forest-700/60 transition-colors motion-reduce:transition-none"
            aria-label="Close menu"
          >
            <XIcon size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar — thin, just hamburger on mobile + notification bell */}
        <header className="sticky top-0 z-30 h-14 bg-cream-50/80 backdrop-blur border-b border-sage-200 flex items-center justify-between px-3 sm:px-4 md:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 -ml-2 rounded-md text-forest-900 hover:bg-sage-100 transition-colors motion-reduce:transition-none"
            aria-label="Open menu"
          >
            <MenuIcon size={20} />
          </button>
          <div className="md:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-forest-800 text-mint-200 flex items-center justify-center font-bold text-xs">
              T
            </div>
            <span className="text-sm font-semibold text-forest-900">TechForce</span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-1">
            <NotificationBell />
            <div className="w-px h-6 bg-sage-200 mx-1" />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-8 py-4 sm:py-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
