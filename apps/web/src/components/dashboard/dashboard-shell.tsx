"use client";

import Link from "next/link";

// ─── WorkspaceCard ─────────────────────────────────────────────────────────────

export type WorkspaceCardProps = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href: string;
};

export function WorkspaceCard({ icon, title, subtitle, href }: WorkspaceCardProps) {
  return (
    <Link
      href={href}
      className="group block bg-white rounded-xl border border-sage-200 p-4 hover:border-forest-300 hover:shadow-card transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-9 h-9 rounded-lg bg-sage-100 flex items-center justify-center text-forest-700 shrink-0">
          {icon}
        </div>
        <span className="text-sage-300 group-hover:text-forest-600 transition-colors text-base leading-none mt-1">→</span>
      </div>
      <p className="font-semibold text-forest-900 text-sm leading-snug">{title}</p>
      <p className="text-sage-500 text-xs mt-0.5 leading-snug">{subtitle}</p>
    </Link>
  );
}

// ─── StatStrip ─────────────────────────────────────────────────────────────────

export type StatItem = {
  label: string;
  value: string | number;
  href?: string;
};

export type StatStripProps = {
  title: string;
  stats: StatItem[];
};

export function StatStrip({ title, stats }: StatStripProps) {
  return (
    <div className="bg-white rounded-xl border border-sage-200 p-4 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-4 sm:mb-5">{title}</p>
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-6 gap-y-5 sm:gap-8">
        {stats.map(({ label, value, href }) =>
          href ? (
            <Link
              key={label}
              href={href}
              className="hover:opacity-70 transition-opacity motion-reduce:transition-none"
            >
              <p className="text-[11px] uppercase tracking-wider text-sage-500 mb-1">{label}</p>
              <p className="text-2xl sm:text-3xl font-bold text-forest-900">{value}</p>
            </Link>
          ) : (
            <div key={label}>
              <p className="text-[11px] uppercase tracking-wider text-sage-500 mb-1">{label}</p>
              <p className="text-2xl sm:text-3xl font-bold text-forest-900">{value}</p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

// ─── DashboardHeader ───────────────────────────────────────────────────────────

export type DashboardHeaderProps = {
  breadcrumb?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export function DashboardHeader({ breadcrumb = "Workspace / Dashboard", title, subtitle, action }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
      <div className="min-w-0">
        <p className="text-xs text-sage-400 mb-1">{breadcrumb}</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-forest-900">{title}</h1>
        {subtitle && <p className="text-sage-500 text-sm mt-1">{subtitle}</p>}
      </div>
      {action && (
        <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-initial">
          {action}
        </div>
      )}
    </div>
  );
}
