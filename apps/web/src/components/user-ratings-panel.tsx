"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader, CardTitle, StarRating } from "@techorbit/ui";
import type { RatingListResponse } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { getRatingClient } from "@/lib/api-client";

type Props = {
  userId: string;
  title?: string;
  limit?: number;
};

function formatAverage(n: number | null): string {
  if (n === null) return "—";
  return (Math.round(n * 10) / 10).toFixed(1);
}

export function UserRatingsPanel({ userId, title = "Ratings", limit = 20 }: Props): JSX.Element {
  const [data, setData] = useState<RatingListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRatingClient()
      .list({ userId, limit })
      .then(setData)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Failed to load ratings"),
      )
      .finally(() => setLoading(false));
  }, [userId, limit]);

  if (loading) {
    return (
      <Card>
        <CardBody>
          <p className="text-sage-500 text-sm">Loading ratings…</p>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardBody>
          <p className="text-danger text-sm">{error}</p>
        </CardBody>
      </Card>
    );
  }

  if (!data || data.totalCount === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardBody>
          <p className="text-sage-500 text-sm">No ratings yet.</p>
        </CardBody>
      </Card>
    );
  }

  const { data: ratings, averageOverall, averageTechnical, averageCommunication, averageProfessionalism, totalCount } = data;
  const displayed = ratings.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="text-4xl font-bold text-forest-900">{formatAverage(averageOverall)}</div>
          <div>
            <StarRating value={averageOverall} readOnly size="md" aria-label={`Average rating ${formatAverage(averageOverall)} out of 5`} />
            <p className="text-xs text-sage-600 mt-1">
              Based on {totalCount} placement{totalCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {(averageTechnical !== null || averageCommunication !== null || averageProfessionalism !== null) && (
          <div className="grid grid-cols-3 gap-3 text-xs">
            {averageTechnical !== null && (
              <div className="rounded-lg border border-surface-border p-3 text-center">
                <p className="text-sage-500 uppercase tracking-wider mb-1">Technical</p>
                <p className="text-lg font-semibold text-forest-900">{formatAverage(averageTechnical)}</p>
              </div>
            )}
            {averageCommunication !== null && (
              <div className="rounded-lg border border-surface-border p-3 text-center">
                <p className="text-sage-500 uppercase tracking-wider mb-1">Communication</p>
                <p className="text-lg font-semibold text-forest-900">{formatAverage(averageCommunication)}</p>
              </div>
            )}
            {averageProfessionalism !== null && (
              <div className="rounded-lg border border-surface-border p-3 text-center">
                <p className="text-sage-500 uppercase tracking-wider mb-1">Professionalism</p>
                <p className="text-lg font-semibold text-forest-900">{formatAverage(averageProfessionalism)}</p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          {displayed.map((r) => (
            <div key={r.id} className="border-l-2 border-forest-100 pl-3 py-1">
              <div className="flex items-center justify-between gap-3">
                <StarRating value={r.overallScore} readOnly size="sm" aria-label={`${r.overallScore} stars`} />
                <span className="text-xs text-sage-500">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
              {r.feedback && (
                <p className="text-sm text-sage-700 mt-1.5 whitespace-pre-wrap">{r.feedback}</p>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-sage-500 mt-1">
                {r.technicalScore !== null && <span>Technical {r.technicalScore}/5</span>}
                {r.communicationScore !== null && <span>Communication {r.communicationScore}/5</span>}
                {r.professionalismScore !== null && <span>Professionalism {r.professionalismScore}/5</span>}
              </div>
            </div>
          ))}
        </div>

        {totalCount > displayed.length && (
          <p className="text-xs text-sage-500 text-center">
            Showing {displayed.length} of {totalCount} ratings
          </p>
        )}
      </CardBody>
    </Card>
  );
}
