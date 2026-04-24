"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Card, CardBody, CardHeader, CardTitle, Button } from "@techorbit/ui";
import type { SubmissionResponse } from "@techorbit/types";
import { getProfileClient, getMatchingClient } from "@/lib/api-client";
import { CandidateEarningsCards } from "./earnings-cards";
import { SearchIcon } from "@/components/icons";

const STATUS_VARIANTS: Record<string, "mint" | "cream" | "success" | "muted" | "warning"> = {
  SUBMITTED: "mint",
  SCREENING: "cream",
  INTERVIEWING: "warning",
  OFFER: "success",
  PLACED: "success",
  REJECTED: "muted",
  WITHDRAWN: "muted",
};

export function CandidateDashboard() {
  const [toggling, setToggling] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMatchingClient()
      .listSubmissions({ limit: 50 })
      .then((r) => setSubmissions(r.data))
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false));
  }, []);

  const { activeCount, recent } = useMemo(() => {
    const activeStatuses = new Set(["SUBMITTED", "SCREENING", "INTERVIEWING", "OFFER"]);
    const a = submissions.filter((s) => activeStatuses.has(s.status)).length;
    const sorted = [...submissions].sort(
      (x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime(),
    );
    return { activeCount: a, recent: sorted.slice(0, 5) };
  }, [submissions]);

  async function toggleAvailability() {
    setToggling(true);
    try {
      const today = new Date().toISOString();
      await getProfileClient().updateCandidateProfile({
        availableFrom: isAvailable ? null : today,
      });
      setIsAvailable(!isAvailable);
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="space-y-6">
      <CandidateEarningsCards />

      {/* Availability toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Availability</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-forest-900">Ready to work</p>
              <p className="text-sm text-sage-600">Signal to recruiters that you&apos;re available now</p>
            </div>
            <Button
              variant={isAvailable ? "primary" : "secondary"}
              size="sm"
              disabled={toggling}
              onClick={toggleAvailability}
            >
              {isAvailable ? "Available ✓" : "Set available"}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Active submissions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Your submissions</CardTitle>
            <Link
              href="/requirements"
              className="text-sm text-forest-700 hover:underline"
            >
              Browse requirements →
            </Link>
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-sage-500 text-sm">Loading…</p>
          ) : recent.length === 0 ? (
            <div className="text-center py-8 text-sage-500">
              <div className="flex justify-center mb-2 text-sage-400"><SearchIcon size={28} /></div>
              <p className="font-medium text-forest-900 mb-1">No submissions yet</p>
              <p className="text-sm">Browse open requirements and apply to ones that fit.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-sage-600 mb-3">
                {activeCount > 0
                  ? `${activeCount} active submission${activeCount === 1 ? "" : "s"} — recruiters are reviewing.`
                  : "No active submissions right now."}
              </p>
              <ul className="divide-y divide-sage-100">
                {recent.map((s) => (
                  <li key={s.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-forest-900 text-sm truncate">
                        Requirement {s.requirementId.slice(0, 8)}…
                      </p>
                      <p className="text-xs text-sage-600 mt-0.5">
                        Submitted {new Date(s.createdAt).toLocaleDateString()}
                        {s.matchScore !== null && <> · Match {s.matchScore}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={STATUS_VARIANTS[s.status] ?? "muted"}>
                        {s.status}
                      </Badge>
                      <Link
                        href={`/submissions/${s.id}`}
                        className="text-sm text-forest-700 hover:underline"
                      >
                        View →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
