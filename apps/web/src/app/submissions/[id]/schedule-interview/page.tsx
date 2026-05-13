"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardBody, CardHeader, CardTitle, Input, Label } from "@techorbit/ui";
import type { SubmissionResponse } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { useAuthStore } from "@/store/auth.store";
import { getInterviewClient, getMatchingClient } from "@/lib/api-client";

type InterviewType = "SELF" | "PLATFORM";

function toLocalDatetimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ScheduleInterviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [submission, setSubmission] = useState<SubmissionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [interviewType, setInterviewType] = useState<InterviewType>("SELF");
  const [interviewerUserId, setInterviewerUserId] = useState("");
  const [scheduledStart, setScheduledStart] = useState(
    toLocalDatetimeValue(new Date(Date.now() + 24 * 3600 * 1000)),
  );
  const [scheduledEnd, setScheduledEnd] = useState(
    toLocalDatetimeValue(new Date(Date.now() + 25 * 3600 * 1000)),
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isCustomer = user?.roles?.some((r) => r.roleType === "CUSTOMER");

  useEffect(() => {
    if (!params?.id) return;
    getMatchingClient()
      .getSubmission(params.id)
      .then(setSubmission)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Failed to load submission"),
      )
      .finally(() => setLoading(false));
  }, [params?.id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!submission || !params?.id) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const iv = await getInterviewClient().schedule({
        requirementId: submission.requirementId,
        submissionId: submission.id,
        candidateId: submission.candidateId,
        scheduledStart: new Date(scheduledStart).toISOString(),
        scheduledEnd: new Date(scheduledEnd).toISOString(),
        interviewerUserId:
          interviewType === "PLATFORM" && interviewerUserId.trim()
            ? interviewerUserId.trim()
            : undefined,
      });
      router.push(`/interviews/${iv.id}?just_scheduled=1`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Failed to schedule interview");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sage-600">Loading…</p>;
  if (loadError || !submission) {
    return (
      <Card>
        <CardBody className="text-red-700">{loadError ?? "Submission not found"}</CardBody>
      </Card>
    );
  }
  if (!isCustomer) {
    return (
      <Card>
        <CardBody>
          <p className="text-sage-700">Only customers can schedule interviews.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link
          href={`/submissions/${submission.id}`}
          className="text-sm text-forest-700 hover:underline"
        >
          ← Back to submission
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-forest-900 mb-1">Schedule interview</h1>
      <p className="text-sage-600 mb-6 text-sm">
        Candidate: <strong>{submission.candidateId.slice(0, 8)}…</strong>
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Interview details</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-5">
            {/* Step 1 — type */}
            <div>
              <Label>Interview type</Label>
              <div className="mt-2 space-y-2">
                {(["SELF", "PLATFORM"] as InterviewType[]).map((t) => (
                  <label key={t} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="interviewType"
                      value={t}
                      checked={interviewType === t}
                      onChange={() => setInterviewType(t)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-forest-900">
                        {t === "SELF" ? "I'll conduct this myself" : "Platform interviewer"}
                      </p>
                      <p className="text-xs text-sage-600">
                        {t === "SELF"
                          ? "You and the candidate will use the video room."
                          : "Assign a vetted Techorbit interviewer and receive a scorecard."}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Step 2 — interviewer ID (Sprint 5 simple version) */}
            {interviewType === "PLATFORM" && (
              <div>
                <Label htmlFor="interviewerUserId">Interviewer user ID</Label>
                <Input
                  id="interviewerUserId"
                  value={interviewerUserId}
                  onChange={(e) => setInterviewerUserId(e.target.value)}
                  placeholder="UUID from the interviewer marketplace"
                  disabled={submitting}
                />
                <p className="mt-1 text-xs text-sage-600">
                  Browse <Link href="/interviewers" className="text-forest-700 hover:underline">the interviewer marketplace</Link> to find a UUID.
                  Full picker lands in Sprint 5.5.
                </p>
              </div>
            )}

            {/* Step 3 — time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduledStart">Start time</Label>
                <Input
                  id="scheduledStart"
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
              <div>
                <Label htmlFor="scheduledEnd">End time</Label>
                <Input
                  id="scheduledEnd"
                  type="datetime-local"
                  value={scheduledEnd}
                  onChange={(e) => setScheduledEnd(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            {submitError && (
              <div className="p-3 rounded bg-red-50 text-red-800 text-sm">{submitError}</div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Scheduling…" : "Schedule interview"}
              </Button>
              <Link href={`/submissions/${submission.id}`}>
                <Button type="button" variant="secondary" disabled={submitting}>
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
