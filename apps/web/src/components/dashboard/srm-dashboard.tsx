"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import type { SubmissionResponse } from "@techorbit/types";
import { getMatchingClient } from "@/lib/api-client";
import { BrokerEarningsCards } from "./earnings-cards";
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

export function SrmDashboard() {
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMatchingClient()
      .listSubmissions({ submitterRole: "SRM", limit: 100 })
      .then((r) => setSubmissions(r.data))
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false));
  }, []);

  const { active, placed, recent } = useMemo(() => {
    const activeStatuses = new Set(["SUBMITTED", "SCREENING", "INTERVIEWING", "OFFER"]);
    const a = submissions.filter((s) => activeStatuses.has(s.status)).length;
    const p = submissions.filter((s) => s.status === "PLACED").length;
    const sorted = [...submissions].sort(
      (x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime(),
    );
    return { active: a, placed: p, recent: sorted.slice(0, 5) };
  }, [submissions]);

  return (
    <div className="space-y-6">
      <BrokerEarningsCards />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wider text-sage-500 mb-1">
              Active submissions
            </p>
            <p className="text-2xl font-bold text-forest-900">{active}</p>
            <p className="text-xs text-sage-500 mt-1">
              {active === 0 ? "Nothing in flight" : "Awaiting customer decision"}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wider text-sage-500 mb-1">
              Placements closed
            </p>
            <p className="text-2xl font-bold text-forest-900">{placed}</p>
            <p className="text-xs text-sage-500 mt-1">Lifetime</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent submissions</CardTitle>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-sage-500 text-sm">Loading…</p>
          ) : recent.length === 0 ? (
            <div className="text-center py-6 text-sage-500">
              <div className="flex justify-center mb-2 text-sage-400"><SearchIcon size={28} /></div>
              <p className="text-sm">No submissions yet.</p>
              <Link
                href="/requirements"
                className="text-sm text-forest-700 hover:underline mt-2 inline-block"
              >
                Find a requirement to submit to →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-sage-100">
              {recent.map((s) => (
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
          )}
        </CardBody>
      </Card>
    </div>
  );
}
