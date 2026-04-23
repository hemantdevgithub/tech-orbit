"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

export default function RootPage() {
  const router = useRouter();
  const { status, user } = useAuthStore();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "authenticated" && user) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [status, user, router]);

  return null;
}
