"use client";

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
      <div className="hidden lg:flex w-[420px] shrink-0 bg-forest-800 flex-col justify-between p-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-mint-200 flex items-center justify-center font-bold text-forest-800 text-sm">T</div>
          <span className="text-base font-semibold text-cream-100">Techorbit</span>
        </div>
        <div>
          <p className="text-3xl font-bold text-cream-100 leading-snug mb-3">
            The US IT staffing marketplace
          </p>
          <p className="text-sage-400 text-sm leading-relaxed">
            Connect customers with top consultants. Post requirements, submit candidates, schedule interviews — all in one platform.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["Customers", "CRMs", "SRMs", "Candidates", "MSMEs", "Interviewers"].map((role) => (
            <span key={role} className="px-3 py-1 rounded-full bg-forest-700 text-cream-200 text-xs font-medium border border-forest-600">{role}</span>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 bg-cream-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-forest-800 flex items-center justify-center">
                <span className="text-cream-100 font-bold text-base">T</span>
              </div>
              <span className="text-xl font-bold text-forest-900">Techorbit</span>
            </div>
          </div>

          <div className="bg-surface rounded-2xl shadow-popover border border-surface-border p-8">
            <h1 className="text-xl font-bold text-forest-900 mb-1">{title}</h1>
            {subtitle && <p className="text-sage-500 text-sm mb-6">{subtitle}</p>}

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
