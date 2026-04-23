"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

export default function RequirementsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, status } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!user) router.replace("/login");
  }, [user, status, router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-mint-50">
      <div className="max-w-6xl mx-auto px-4 py-10">{children}</div>
    </div>
  );
}
