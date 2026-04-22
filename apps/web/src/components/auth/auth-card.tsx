"use client";

export interface AuthCardProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
}

export function AuthCard({ children, title, subtitle, footer }: AuthCardProps) {
  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-forest-800 flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <span className="text-2xl font-bold text-forest-900">Techorbit</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-card border border-surface-border p-8">
          <h1 className="text-2xl font-bold text-forest-900 mb-1">{title}</h1>
          {subtitle && (
            <p className="text-sage-600 mb-6">{subtitle}</p>
          )}

          {children}

          {footer && (
            <div className="mt-6 pt-6 border-t border-surface-border">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
