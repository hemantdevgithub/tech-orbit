"use client";

import Link from "next/link";

export interface AuthCardProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
}

export function AuthCard({ children, title, subtitle, footer }: AuthCardProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex w-[420px] shrink-0 bg-forest-800 flex-col justify-between p-10 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-forest-700/40 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-mint-300/10 blur-3xl"
        />
        <Link
          href="/"
          className="relative flex items-center gap-2.5 group focus:outline-none"
        >
          <div className="w-9 h-9 rounded-lg bg-mint-200 flex items-center justify-center font-bold text-forest-800 text-base">
            T
          </div>
          <div className="leading-tight">
            <p className="text-[10px] uppercase tracking-widest text-sage-400 font-semibold group-hover:text-mint-200 transition-colors motion-reduce:transition-none">
              TechOrbit
            </p>
            <p className="text-base font-semibold text-cream-100">TechForce</p>
          </div>
        </Link>
        <div className="relative">
          <p className="text-3xl font-bold text-cream-100 leading-snug mb-3">
            Where talent meets opportunity.
          </p>
          <p className="text-sage-400 text-sm leading-relaxed">
            Connect with verified tech consultants, post requirements, and run
            placements end-to-end — transparent commissions, owned payroll, all
            in one platform.
          </p>
        </div>
        <div className="relative flex flex-wrap gap-2">
          {["Customers", "CRMs", "SRMs", "Candidates", "MSMEs"].map((role) => (
            <span
              key={role}
              className="px-3 py-1 rounded-full bg-forest-700 text-cream-200 text-xs font-medium border border-forest-600"
            >
              {role}
            </span>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 bg-cream-50 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link
            href="/"
            className="lg:hidden flex items-center justify-center gap-2 mb-6 sm:mb-8 group focus:outline-none"
          >
            <div className="w-10 h-10 rounded-lg bg-forest-800 flex items-center justify-center">
              <span className="text-mint-200 font-bold text-lg">T</span>
            </div>
            <div className="leading-tight text-left">
              <p className="text-[10px] uppercase tracking-widest text-sage-500 font-semibold">
                TechOrbit
              </p>
              <p className="text-lg font-bold text-forest-900">TechForce</p>
            </div>
          </Link>

          <div className="bg-surface rounded-2xl shadow-popover border border-surface-border p-6 sm:p-8">
            <h1 className="text-xl sm:text-2xl font-bold text-forest-900 mb-1">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sage-500 text-sm mb-6">{subtitle}</p>
            )}

            {children}

            {footer && (
              <div className="mt-6 pt-5 border-t border-surface-border">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
