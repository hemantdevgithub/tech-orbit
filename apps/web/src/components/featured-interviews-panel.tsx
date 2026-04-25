"use client";

import { Badge, Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import type { InterviewSummary } from "@techorbit/types";

type Props = {
  title?: string;
  interviews: InterviewSummary[];
};

const RECOMMENDATION_LABEL: Record<string, string> = {
  STRONG_YES: "Strong Yes",
  YES: "Yes",
  WEAK_YES: "Weak Yes",
  WEAK_NO: "Weak No",
  NO: "No",
  STRONG_NO: "Strong No",
};

function formatDuration(sec: number | null): string {
  if (!sec || sec <= 0) return "—";
  const mins = Math.floor(sec / 60);
  const secs = sec % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function FeaturedInterviewsPanel({
  title = "Featured interviews",
  interviews,
}: Props): JSX.Element {
  if (interviews.length === 0) return <></>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody>
        <ul className="space-y-4">
          {interviews.map((iv) => (
            <li key={iv.id} className="border-b border-sage-100 pb-4 last:border-0 last:pb-0">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="font-medium text-forest-900 text-sm">
                    {formatDate(iv.scheduledStart)} · {formatDuration(iv.durationSec)}
                  </p>
                  <p className="text-xs text-sage-600 mt-0.5">
                    {iv.conductedByRole === "PLATFORM_INTERVIEWER"
                      ? "Techorbit interviewer"
                      : "Customer interview"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {iv.recommendation && (
                    <Badge variant="success">
                      {RECOMMENDATION_LABEL[iv.recommendation] ?? iv.recommendation}
                    </Badge>
                  )}
                  {iv.overallScore !== null && (
                    <span className="text-sage-700 text-xs">
                      {iv.overallScore.toFixed(1)}/5 overall
                    </span>
                  )}
                </div>
              </div>
              {iv.recordingStatus === "READY" && iv.recordingUrl ? (
                <video
                  src={iv.recordingUrl}
                  controls
                  preload="metadata"
                  className="w-full rounded bg-sage-100 aspect-video"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="rounded bg-sage-50 text-sage-600 text-sm p-4 text-center">
                  {iv.recordingStatus === "PROCESSING"
                    ? "Recording is processing — check back shortly."
                    : "Recording not available."}
                </div>
              )}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
