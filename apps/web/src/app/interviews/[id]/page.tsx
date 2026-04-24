"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge, Button, Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import type { InterviewResponse, InterviewStatus, ScorecardResponse, UserProfile } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { useAuthStore } from "@/store/auth.store";
import { getInterviewClient } from "@/lib/api-client";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { useDisplayName } from "@/lib/display-names";

// useSearchParams requires Suspense in App Router (static export guard)
export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<InterviewStatus, "mint" | "cream" | "muted" | "success" | "warning" | "danger"> = {
  SCHEDULED: "mint",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  NO_SHOW: "danger",
  CANCELLED: "muted",
};

export default function InterviewDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const [iv, setIv] = useState<InterviewResponse | null>(null);
  const [scorecard, setScorecard] = useState<ScorecardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    if (!params?.id) return;
    setLoading(true);
    try {
      const data = await getInterviewClient().getById(params.id);
      setIv(data);
      // Try to fetch scorecard (will 403 for candidates — that's expected)
      getInterviewClient()
        .getScorecard(data.id)
        .then(setScorecard)
        .catch(() => setScorecard(null));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load interview");
    } finally {
      setLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (searchParams?.get("just_scheduled") === "1") setNotice("Interview scheduled successfully.");
    if (searchParams?.get("scorecard_submitted") === "1") setNotice("Scorecard submitted.");
  }, [searchParams]);

  async function onCancel() {
    if (!iv) return;
    const reason = window.prompt("Reason for cancelling?");
    if (!reason?.trim()) return;
    setWorking(true);
    try {
      const updated = await getInterviewClient().cancel(iv.id, { reason: reason.trim() });
      setIv(updated);
      setNotice("Interview cancelled.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to cancel");
    } finally {
      setWorking(false);
    }
  }

  if (loading) return <p className="text-sage-600">Loading interview…</p>;
  if (error && !iv) {
    return <Card><CardBody className="text-red-700">{error}</CardBody></Card>;
  }
  if (!iv) return <p>Not found.</p>;

  return <InterviewDetailInner iv={iv} scorecard={scorecard} notice={notice} error={error} working={working} onCancel={onCancel} user={user} />;
}

function InterviewDetailInner({
  iv,
  scorecard,
  notice,
  error,
  working,
  onCancel,
  user,
}: {
  iv: InterviewResponse;
  scorecard: ScorecardResponse | null;
  notice: string | null;
  error: string | null;
  working: boolean;
  onCancel: () => Promise<void>;
  user: UserProfile | null;
}): JSX.Element {
  const candidateName = useDisplayName(iv.candidateId, "candidate");
  const interviewerName = useDisplayName(iv.interviewerUserId ?? null, "interviewer");

  const isScheduler = user?.id === iv.scheduledByUserId;
  const isInterviewer = user?.id === iv.interviewerUserId;
  const isCandidate = user?.id === iv.candidateId;
  const canJoin = (isScheduler || isInterviewer || isCandidate) && iv.videoRoomUrl;
  const canCancel = (isScheduler || isInterviewer) && iv.status === "SCHEDULED";
  const canScorecard =
    (isScheduler || isInterviewer) && iv.status === "COMPLETED" && !scorecard;

  const startDate = new Date(iv.scheduledStart);
  const interviewTitle = `${startDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} · ${startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Interviews", href: "/interviews" },
          { label: interviewTitle },
        ]}
      />

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-forest-900">{interviewTitle}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[iv.status]}>{iv.status}</Badge>
            <span className="text-sage-600 text-sm">
              Ends{" "}
              {new Date(iv.scheduledEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {" · "}
              <Link
                href={`/submissions/${iv.submissionId}`}
                className="text-forest-700 hover:underline"
              >
                View submission →
              </Link>
            </span>
          </div>
        </div>
      </div>

      {notice && (
        <div className="mb-4 p-3 rounded bg-mint-200 text-forest-900 text-sm">{notice}</div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-800 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardBody>
              <dl className="grid grid-cols-2 gap-y-3 text-sm">
                <dt className="text-sage-600">Candidate</dt>
                <dd>
                  <Link
                    href={`/candidates/${iv.candidateId}`}
                    className="text-forest-700 hover:underline"
                  >
                    {candidateName}
                  </Link>
                </dd>
                <dt className="text-sage-600">Interviewer</dt>
                <dd>
                  {iv.interviewerUserId ? (
                    <Link
                      href={`/interviewers/${iv.interviewerUserId}`}
                      className="text-forest-700 hover:underline"
                    >
                      {interviewerName}
                    </Link>
                  ) : (
                    "Self-conducted"
                  )}
                </dd>
                <dt className="text-sage-600">Type</dt>
                <dd><Badge variant="muted">{iv.conductedByRole.replace("_", " ")}</Badge></dd>
                {iv.interviewerFeeUsd !== null && (
                  <>
                    <dt className="text-sage-600">Interviewer fee</dt>
                    <dd>${iv.interviewerFeeUsd}/hr</dd>
                  </>
                )}
              </dl>
            </CardBody>
          </Card>

          {scorecard && (
            <Card>
              <CardHeader><CardTitle>Scorecard</CardTitle></CardHeader>
              <CardBody>
                <dl className="grid grid-cols-2 gap-y-3 text-sm">
                  <dt className="text-sage-600">Recommendation</dt>
                  <dd><Badge variant="success">{scorecard.recommendation.replace("_", " ")}</Badge></dd>
                  {scorecard.technicalScore !== null && (
                    <>
                      <dt className="text-sage-600">Technical</dt>
                      <dd>{"★".repeat(scorecard.technicalScore)}{"☆".repeat(5 - scorecard.technicalScore)}</dd>
                    </>
                  )}
                  {scorecard.communicationScore !== null && (
                    <>
                      <dt className="text-sage-600">Communication</dt>
                      <dd>{"★".repeat(scorecard.communicationScore)}{"☆".repeat(5 - scorecard.communicationScore)}</dd>
                    </>
                  )}
                  {scorecard.wouldHireAgain !== null && (
                    <>
                      <dt className="text-sage-600">Would hire again?</dt>
                      <dd>{scorecard.wouldHireAgain ? "Yes" : "No"}</dd>
                    </>
                  )}
                </dl>
                {scorecard.freeformFeedback && (
                  <div className="mt-4">
                    <p className="text-xs text-sage-600 mb-1">Feedback</p>
                    <p className="text-sm text-sage-800 whitespace-pre-wrap">{scorecard.freeformFeedback}</p>
                  </div>
                )}
                {scorecard.redFlags && (
                  <div className="mt-3 p-3 rounded bg-red-50 text-red-800 text-xs">
                    <strong>Red flags:</strong> {scorecard.redFlags}
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          {canJoin && (
            <Card>
              <CardHeader><CardTitle>Video call</CardTitle></CardHeader>
              <CardBody>
                <Link href={`/interviews/${iv.id}/call`} className="block">
                  <Button className="w-full">Join video call</Button>
                </Link>
              </CardBody>
            </Card>
          )}

          {canScorecard && (
            <Card>
              <CardHeader><CardTitle>Post-interview</CardTitle></CardHeader>
              <CardBody>
                <Link href={`/interviews/${iv.id}/scorecard`} className="block">
                  <Button variant="secondary" className="w-full">Submit scorecard</Button>
                </Link>
              </CardBody>
            </Card>
          )}

          {canCancel && (
            <Card>
              <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
              <CardBody>
                <Button variant="secondary" className="w-full" onClick={onCancel} disabled={working}>
                  Cancel interview
                </Button>
              </CardBody>
            </Card>
          )}

          {iv.videoRecordingUrl && (
            <Card>
              <CardHeader><CardTitle>Recording</CardTitle></CardHeader>
              <CardBody>
                <a href={iv.videoRecordingUrl} target="_blank" rel="noreferrer"
                  className="text-sm text-forest-700 hover:underline">
                  Download recording →
                </a>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
