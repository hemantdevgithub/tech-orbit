"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { UserRatingsPanel } from "@/components/user-ratings-panel";

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const { user: me } = useAuthStore();
  const id = params?.id;

  if (!id) return null;

  const isSelf = me?.id === id;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-forest-700 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-forest-900 mt-2">
          {isSelf ? "Your profile" : "User profile"}
        </h1>
        <p className="text-sage-500 text-xs mt-0.5 font-mono">{id}</p>
      </div>

      <UserRatingsPanel userId={id} title="Ratings & reviews" />
    </div>
  );
}
