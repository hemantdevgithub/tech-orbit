"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle, Button, Badge } from "@techorbit/ui";
import type { RequirementResponse } from "@techorbit/types";
import { getRequirementClient } from "@/lib/api-client";
import { CustomerEarningsCards } from "./earnings-cards";
import { BriefcaseIcon } from "@/components/icons";

const STATUS_VARIANTS: Record<string, "mint" | "cream" | "success" | "muted" | "warning"> = {
  DRAFT: "cream",
  OPEN: "success",
  INTERVIEWING: "warning",
  OFFER_EXTENDED: "mint",
  PLACED: "success",
  CLOSED: "muted",
  CANCELLED: "muted",
};

export function CustomerDashboard() {
  const [requirements, setRequirements] = useState<RequirementResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRequirementClient()
      .list({ limit: 10 })
      .then((r) => setRequirements(r.data))
      .catch(() => setRequirements([]))
      .finally(() => setLoading(false));
  }, []);

  const openCount = requirements.filter((r) => r.status === "OPEN").length;

  return (
    <div className="space-y-6">
      <CustomerEarningsCards />

      {/* Post requirement */}
      <Card>
        <CardHeader>
          <CardTitle>Requirements</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sage-600 text-sm">
              {openCount > 0
                ? `You have ${openCount} open requirement${openCount === 1 ? "" : "s"} receiving submissions.`
                : "Post IT requirements to find pre-vetted consultants."}
            </p>
            <Link href="/requirements/new">
              <Button>Post a requirement</Button>
            </Link>
          </div>
        </CardBody>
      </Card>

      {/* Active requirements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Your requirements</CardTitle>
            {requirements.length > 0 && (
              <Link
                href="/requirements"
                className="text-sm text-forest-700 hover:underline"
              >
                View all →
              </Link>
            )}
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-sage-500 text-sm">Loading…</p>
          ) : requirements.length === 0 ? (
            <div className="text-center py-8 text-sage-500">
              <div className="flex justify-center mb-2 text-sage-400"><BriefcaseIcon size={28} /></div>
              <p className="font-medium text-forest-900 mb-1">No requirements yet</p>
              <p className="text-sm">
                <Link href="/requirements/new" className="text-forest-700 hover:underline">
                  Post your first one →
                </Link>
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-sage-100">
              {requirements.slice(0, 5).map((r) => (
                <li key={r.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-forest-900 text-sm truncate">
                      {r.title}
                    </p>
                    <p className="text-xs text-sage-600 mt-0.5">
                      {r.seniority} · {r.locationType} · ${r.billRateMinUsd}–${r.billRateMaxUsd}/hr
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={STATUS_VARIANTS[r.status] ?? "muted"}>
                      {r.status}
                    </Badge>
                    <Link
                      href={`/requirements/${r.id}`}
                      className="text-sm text-forest-700 hover:underline"
                    >
                      View →
                    </Link>
                  </div>
                </li>
              ))}
              {requirements.length > 5 && (
                <li className="py-3 text-xs text-sage-500 text-center">
                  +{requirements.length - 5} more
                </li>
              )}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
