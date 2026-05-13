"use client";

import { useAuthGuard } from "@/lib/use-auth-guard";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ready } = useAuthGuard();
  if (!ready) return null;

  return (
    <div className="min-h-screen bg-mint-50">
      <div className="max-w-4xl mx-auto px-4 py-10">{children}</div>
    </div>
  );
}
