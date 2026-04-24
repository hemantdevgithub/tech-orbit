"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import type { InterviewResponse, InterviewStatus } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { getInterviewClient } from "@/lib/api-client";
import { Breadcrumbs } from "@/components/breadcrumbs";

const STATUS_VARIANT: Record<InterviewStatus, "mint" | "cream" | "muted" | "success" | "warning" | "danger"> = {
  SCHEDULED: "mint",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  NO_SHOW: "danger",
  CANCELLED: "muted",
};

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<InterviewResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInterviewClient()
      .list({ limit: 50 })
      .then((res) => setInterviews(res.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sage-600">Loading interviews…</p>;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Interviews" },
        ]}
      />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-forest-900">My interviews</h1>
        <p className="text-sage-600 text-sm mt-1">
          {interviews.length > 0
            ? `${interviews.length} interview${interviews.length === 1 ? "" : "s"} scheduled`
            : "All interviews you are scheduled for as customer, candidate, or interviewer."}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-800 text-sm">{error}</div>
      )}

      {interviews.length === 0 ? (
        <Card>
          <CardHeader><CardTitle>No interviews yet</CardTitle></CardHeader>
          <CardBody>
            <p className="text-sage-600 text-sm">
              Interviews will appear here once customers schedule them from their submission shortlists.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {interviews.map((iv) => {
            const date = new Date(iv.scheduledStart);
            return (
              <Link key={iv.id} href={`/interviews/${iv.id}`} className="block">
                <Card className="hover:border-forest-300 transition-colors">
                  <CardBody className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-forest-900">
                        {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}{" "}
                        · {date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </p>
                      <p className="text-xs text-sage-600 mt-0.5">
                        {iv.conductedByRole.replace("_", " ")} interview · Candidate #{iv.candidateId.slice(0, 8)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_VARIANT[iv.status]}>{iv.status}</Badge>
                      <span className="text-sage-400 text-sm">→</span>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
