"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle, Button, Badge } from "@techorbit/ui";
import type { BenchEntryResponse, SubmissionResponse } from "@techorbit/types";
import { getProfileClient, getMatchingClient } from "@/lib/api-client";
import { VendorEarningsCards } from "./earnings-cards";

const SUBMISSION_STATUS_VARIANTS: Record<string, "mint" | "cream" | "success" | "muted" | "warning"> = {
  SUBMITTED: "mint",
  SCREENING: "cream",
  INTERVIEWING: "warning",
  OFFER: "success",
  PLACED: "success",
  REJECTED: "muted",
  WITHDRAWN: "muted",
};

const AVAILABILITY_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  ENGAGED: "Engaged",
  NOTICE_PERIOD: "Notice period",
  UNAVAILABLE: "Unavailable",
};

export function MsmeDashboard() {
  const [benchEntries, setBenchEntries] = useState<BenchEntryResponse[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getProfileClient().getBenchEntries().then((r) => r.data).catch(() => []),
      getMatchingClient()
        .listSubmissions({ submitterRole: "MSME", limit: 50 })
        .then((r) => r.data)
        .catch(() => []),
    ])
      .then(([bench, subs]) => {
        setBenchEntries(bench);
        setSubmissions(subs);
      })
      .finally(() => setLoading(false));
  }, []);

  const { activeCount, recentSubmissions } = useMemo(() => {
    const activeStatuses = new Set(["SUBMITTED", "SCREENING", "INTERVIEWING", "OFFER"]);
    const a = submissions.filter((s) => activeStatuses.has(s.status)).length;
    const sorted = [...submissions].sort(
      (x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime(),
    );
    return { activeCount: a, recentSubmissions: sorted.slice(0, 5) };
  }, [submissions]);

  return (
    <div className="space-y-6">
      <VendorEarningsCards />

      {/* Bench roster */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bench roster</CardTitle>
            <Button size="sm" disabled>+ Add consultant</Button>
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-sage-500 text-sm">Loading…</p>
          ) : benchEntries.length === 0 ? (
            <p className="text-sage-500 text-sm">No bench entries yet. Add consultants you have available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-sage-500 border-b border-sage-200">
                    <th className="pb-2 font-medium">Consultant ID</th>
                    <th className="pb-2 font-medium">Availability</th>
                    <th className="pb-2 font-medium">Rate range</th>
                    <th className="pb-2 font-medium">Skills</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage-100">
                  {benchEntries.map((e) => (
                    <tr key={e.id}>
                      <td className="py-3 text-forest-800 font-mono text-xs">{e.candidateUserId.slice(0, 8)}…</td>
                      <td className="py-3">
                        <Badge variant={e.availability === "AVAILABLE" ? "success" : "muted"}>
                          {AVAILABILITY_LABELS[e.availability] ?? e.availability}
                        </Badge>
                      </td>
                      <td className="py-3 text-sage-700">
                        {e.expectedRateMin && e.expectedRateMax
                          ? `$${e.expectedRateMin}–$${e.expectedRateMax}/hr`
                          : "—"}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {e.skills.slice(0, 3).map((s) => (
                            <span key={s} className="bg-forest-100 text-forest-700 text-xs px-2 py-0.5 rounded-full">{s}</span>
                          ))}
                          {e.skills.length > 3 && (
                            <span className="text-sage-500 text-xs">+{e.skills.length - 3}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Active submissions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active submissions</CardTitle>
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
          ) : recentSubmissions.length === 0 ? (
            <div className="text-center py-6 text-sage-500">
              <p className="text-2xl mb-1">📋</p>
              <p className="text-sm">No submissions yet.</p>
              <p className="text-xs mt-1">Submit bench candidates to open requirements.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-sage-600 mb-3">
                {activeCount > 0
                  ? `${activeCount} active submission${activeCount === 1 ? "" : "s"} awaiting customer decision.`
                  : "No active submissions right now."}
              </p>
              <ul className="divide-y divide-sage-100">
                {recentSubmissions.map((s) => (
                  <li key={s.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-forest-900 text-sm truncate">
                        Candidate {s.candidateId.slice(0, 8)}… → Req {s.requirementId.slice(0, 8)}…
                      </p>
                      <p className="text-xs text-sage-600 mt-0.5">
                        {new Date(s.createdAt).toLocaleDateString()}
                        {s.matchScore !== null && <> · Match {s.matchScore}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={SUBMISSION_STATUS_VARIANTS[s.status] ?? "muted"}>
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
