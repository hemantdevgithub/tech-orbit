"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import type { PlacementResponse, PlacementStatus } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { getPlacementClient } from "@/lib/api-client";

const STATUS_STYLES: Record<PlacementStatus, string> = {
  ACTIVE:          "bg-success/10 text-success border-success/30",
  ENDED_COMPLETED: "bg-surface-soft text-sage-500 border-surface-border",
  ENDED_EARLY:     "bg-warning/10 text-warning border-warning/30",
  SUSPENDED:       "bg-danger/10 text-danger border-danger/20",
};

export default function PlacementsListPage() {
  const [rows, setRows] = useState<PlacementResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlacementClient()
      .list({ limit: 50 })
      .then((res) => setRows(res.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sage-500">Loading placements…</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-forest-900">My placements</h1>
        <p className="text-sage-500 text-sm mt-0.5">
          Active and past placements you are part of.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>
      )}

      {rows.length === 0 ? (
        <Card>
          <CardHeader><CardTitle>No placements yet</CardTitle></CardHeader>
          <CardBody>
            <p className="text-sage-500 text-sm">
              Customers create placements from <strong>OFFER</strong>-status submissions.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <Link key={p.id} href={`/placements/${p.id}`} className="block">
              <Card className="hover:border-forest-300 transition-colors">
                <CardBody className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-forest-900">
                      {p.engagementType.replace("_", " ")} placement · ${p.billRateUsd.toFixed(0)}/hr
                    </p>
                    <p className="text-xs text-sage-500 mt-0.5">
                      {new Date(p.startDate).toLocaleDateString()} →{" "}
                      {new Date(p.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[p.status]}`}>
                      {p.status.replace("_", " ")}
                    </span>
                    <span className="text-sage-400 text-sm">→</span>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
