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
  CalendarIcon,
  ClockIcon,
  DollarIcon,
  HandshakeIcon,
  HomeIcon,
  MessageIcon,
  PlusIcon,
  ReceiptIcon,
  SearchIcon,
  ShieldIcon,
  TargetIcon,
} from "@/components/icons";

type RoleType = "CUSTOMER" | "CANDIDATE" | "CRM" | "SRM" | "MSME" | "ADMIN";
type IconComp = (p: { size?: number; className?: string }) => JSX.Element;

const ROLE_LABEL: Record<string, string> = {
  CUSTOMER: "Customer",
  CANDIDATE: "Candidate",
  CRM: "Business Developer",
  SRM: "Recruiter",
  MSME: "Vendor Firm",
  ADMIN: "Admin",
};

// Primary CTA per role — the single most common action that role takes.
type Cta = { label: string; href: string; Icon: IconComp };
const PRIMARY_CTA: Partial<Record<RoleType, Cta>> = {
  CUSTOMER: { label: "Post a requirement", href: "/requirements/new", Icon: PlusIcon },
  CANDIDATE: { label: "Browse opportunities", href: "/requirements", Icon: ArrowRightIcon },
  CRM: { label: "Claim a requirement", href: "/requirements", Icon: ArrowRightIcon },
  SRM: { label: "Find requirements to fill", href: "/requirements", Icon: ArrowRightIcon },
  MSME: { label: "Submit a consultant", href: "/requirements", Icon: ArrowRightIcon },
  ADMIN: { label: "Admin console", href: "/admin", Icon: ShieldIcon },
};

type NavItem = { label: string; href: string; Icon: IconComp; roles: RoleType[] };
const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/dashboard", Icon: HomeIcon, roles: ["CUSTOMER", "CANDIDATE", "CRM", "SRM", "MSME", "ADMIN"] },
  { label: "Requirements", href: "/requirements", Icon: BriefcaseIcon, roles: ["CUSTOMER", "CANDIDATE", "CRM", "SRM", "MSME"] },
  { label: "Interviewers", href: "/interviewers", Icon: TargetIcon, roles: ["CUSTOMER", "CRM"] },
  { label: "Interviews", href: "/interviews", Icon: CalendarIcon, roles: ["CUSTOMER", "CANDIDATE", "SRM"] },
  { label: "Placements", href: "/placements", Icon: HandshakeIcon, roles: ["CUSTOMER", "CANDIDATE", "CRM", "SRM", "MSME"] },
  { label: "Timesheets", href: "/timesheets", Icon: ClockIcon, roles: ["CUSTOMER", "CANDIDATE"] },
  { label: "Invoices", href: "/invoices", Icon: ReceiptIcon, roles: ["CUSTOMER"] },
  { label: "Payouts", href: "/payouts", Icon: DollarIcon, roles: ["CANDIDATE", "CRM", "SRM", "MSME"] },
  { label: "Messages", href: "/messages", Icon: MessageIcon, roles: ["CUSTOMER", "CANDIDATE", "CRM", "SRM", "MSME", "ADMIN"] },
  { label: "Notifications", href: "/notifications", Icon: BellIcon, roles: ["CUSTOMER", "CANDIDATE", "CRM", "SRM", "MSME", "ADMIN"] },
];

// Three search prompts per role. Each submits to a list page with ?search=X.
type SearchField = { placeholder: string; href: string };
const SEARCH_FIELDS: Record<RoleType, SearchField[]> = {
  CUSTOMER: [
    { placeholder: "Find a requirement", href: "/requirements" },
    { placeholder: "Find an interviewer", href: "/interviewers" },
    { placeholder: "Find a placement", href: "/placements" },
  ],
  CANDIDATE: [
    { placeholder: "Find a job", href: "/requirements" },
    { placeholder: "Find an interviewer", href: "/interviewers" },
    { placeholder: "Find a placement", href: "/placements" },
  ],
  CRM: [
    { placeholder: "Find a requirement", href: "/requirements" },
    { placeholder: "Find an interviewer", href: "/interviewers" },
    { placeholder: "Find a placement", href: "/placements" },
  ],
  SRM: [
    { placeholder: "Find a job", href: "/requirements" },
    { placeholder: "Find a submission", href: "/placements" },
    { placeholder: "Find an interview", href: "/interviews" },
  ],
  MSME: [
    { placeholder: "Find a job", href: "/requirements" },
    { placeholder: "Find a submission", href: "/placements" },
    { placeholder: "Find a placement", href: "/placements" },
  ],
  ADMIN: [
    { placeholder: "Find a user", href: "/admin/users" },
    { placeholder: "Find a dispute", href: "/admin/disputes" },
    { placeholder: "Find a role application", href: "/admin/role-applications" },
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
        href="/dashboard"
        className="flex items-center gap-2.5 px-5 h-14 border-b border-forest-700/60 shrink-0"
      >
        <div className="w-8 h-8 rounded-lg bg-mint-200 flex items-center justify-center font-bold text-forest-800 text-sm">
          T
        </div>
        <span className="text-[15px] font-semibold tracking-tight">Techorbit</span>
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
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));
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
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="md:hidden fixed inset-y-0 left-0 z-50">{sidebar}</div>
        </>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar — thin, just hamburger on mobile + notification bell */}
        <header className="sticky top-0 z-30 h-14 bg-cream-50/80 backdrop-blur border-b border-sage-200 flex items-center justify-between px-4 md:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 -ml-2 rounded-md hover:bg-sage-100"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="md:block hidden" />
          <div className="flex items-center gap-1">
            <NotificationBell />
            <div className="w-px h-6 bg-sage-200 mx-1" />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
