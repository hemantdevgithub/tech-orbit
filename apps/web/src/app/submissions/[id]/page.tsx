"use client";

// useSearchParams() forces dynamic rendering.  Opt out of static export.
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@techorbit/ui";
import type {
  CandidateProfileResponse,
  MatchingSignalResponse,
  SubmissionResponse,
  SubmissionStatus,
} from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { useAuthStore } from "@/store/auth.store";
import {
  getMatchingClient,
  getProfileClient,
  getRequirementClient,
} from "@/lib/api-client";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { useDisplayName } from "@/lib/display-names";

const STATUS_VARIANT: Record<
  SubmissionStatus,
  "mint" | "cream" | "muted" | "success" | "warning" | "danger"
> = {
  SUBMITTED: "mint",
  SCREENING: "cream",
  INTERVIEWING: "cream",
  OFFER: "warning",
  PLACED: "success",
  REJECTED: "danger",
  WITHDRAWN: "muted",
};

const NEXT_STATUSES: Partial<Record<SubmissionStatus, SubmissionStatus[]>> = {
  SUBMITTED: ["SCREENING", "REJECTED"],
  SCREENING: ["INTERVIEWING", "REJECTED"],
  INTERVIEWING: ["OFFER", "REJECTED"],
  OFFER: ["PLACED", "REJECTED"],
};

function scoreClass(score: number | null): string {
  if (score === null) return "bg-sage-200 text-sage-800";
  if (score >= 80) return "bg-mint-200 text-forest-900";
  if (score >= 50) return "bg-cream-200 text-forest-900";
  return "bg-red-100 text-red-900";
}

export default function SubmissionDetailPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const [submission, setSubmission] = useState<SubmissionResponse | null>(null);
  const [signal, setSignal] = useState<MatchingSignalResponse | null>(null);
  const [candidate, setCandidate] = useState<CandidateProfileResponse | null>(null);
  const [requirementOwnerId, setRequirementOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    if (!params?.id) return;
    setLoading(true);
    setError(null);
    try {
      const sub = await getMatchingClient().getSubmission(params.id);
      setSubmission(sub);

      // Fire the two follow-up lookups in parallel; both are allowed to
      // 403/404 without breaking the page.
      const [reqResult, candResult, matchesResult] = await Promise.allSettled([
        getRequirementClient().getById(sub.requirementId),
        getProfileClient().getCandidateByUserId(sub.candidateId),
        getMatchingClient().matchesForRequirement(sub.requirementId, 200),
      ]);
      if (reqResult.status === "fulfilled") {
        setRequirementOwnerId(reqResult.value.createdByUserId);
      }
      if (candResult.status === "fulfilled") {
        setCandidate(candResult.value);
      }
      if (matchesResult.status === "fulfilled") {
        setSignal(
          matchesResult.value.data.find((m) => m.candidateId === sub.candidateId) ??
            null,
        );
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load submission");
    } finally {
      setLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (searchParams?.get("just_submitted") === "1") {
      setNotice("Submission created successfully.");
    }
  }, [searchParams]);

  async function onStatusChange(next: SubmissionStatus): Promise<void> {
    if (!submission) return;
    setWorking(true);
    setError(null);
    try {
      let rejectionReason: string | undefined;
      if (next === "REJECTED") {
        const r = window.prompt("Reason for rejecting this submission?");
        if (!r || !r.trim()) {
          setWorking(false);
          return;
        }
        rejectionReason = r.trim();
      }
      const updated = await getMatchingClient().updateStatus(submission.id, {
        status: next,
        rejectionReason,
      });
      setSubmission(updated);
      setNotice(`Status updated to ${next}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update status");
    } finally {
      setWorking(false);
    }
  }

  async function onWithdraw(): Promise<void> {
    if (!submission) return;
    const reason = window.prompt("Reason for withdrawing this submission?");
    if (!reason || !reason.trim()) return;
    setWorking(true);
    setError(null);
    try {
      const updated = await getMatchingClient().withdraw(submission.id, {
        reason: reason.trim(),
      });
      setSubmission(updated);
      setNotice("Submission withdrawn.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to withdraw");
    } finally {
      setWorking(false);
    }
  }

  if (loading) return <p className="text-sage-600">Loading submission…</p>;
  if (error && !submission) {
    return (
      <Card>
        <CardBody className="text-red-700">{error}</CardBody>
      </Card>
    );
  }
  if (!submission) return <p>Not found.</p>;

  const isSubmitter = user?.id === submission.submittedByUserId;
  const isOwner = user?.id !== null && user?.id === requirementOwnerId;
  const canWithdraw =
    isSubmitter &&
    submission.status !== "WITHDRAWN" &&
    submission.status !== "PLACED";
  const nextStatuses = NEXT_STATUSES[submission.status] ?? [];
  // Fall back to the public display-name when the full profile 403'd.
  const publicName = useDisplayName(submission.candidateId, "candidate");
  const heading = candidate?.headline || publicName;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Requirements", href: "/requirements" },
          { label: "Requirement", href: `/requirements/${submission.requirementId}` },
          { label: heading },
        ]}
      />

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-forest-900">{heading}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sage-600">
            <Badge variant={STATUS_VARIANT[submission.status]}>
              {submission.status}
            </Badge>
            <span>·</span>
            <span>
              Submitted{" "}
              {new Date(submission.createdAt).toLocaleDateString()}
            </span>
            <span>·</span>
            <span>
              {submission.submitterRole === "CANDIDATE_SELF"
                ? "Self-submission"
                : submission.submitterRole === "SRM"
                  ? "Via SRM"
                  : "Via MSME"}
            </span>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${scoreClass(
            submission.matchScore,
          )}`}
        >
          Match {submission.matchScore ?? "—"}
        </span>
      </div>

      {notice && (
        <div className="mb-4 p-3 rounded bg-mint-200 text-forest-900 text-sm">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {signal && (
            <Card>
              <CardHeader>
                <CardTitle>Match breakdown</CardTitle>
              </CardHeader>
              <CardBody>
                <dl className="grid grid-cols-2 gap-y-3 text-sm">
                  <dt className="text-sage-600">Skills overlap</dt>
                  <dd>{signal.skillOverlap}</dd>
                  <dt className="text-sage-600">Seniority</dt>
                  <dd>
                    {signal.seniorityMatch ? (
                      <Badge variant="success">Exact match</Badge>
                    ) : (
                      <Badge variant="muted">Partial / no match</Badge>
                    )}
                  </dd>
                  <dt className="text-sage-600">Location</dt>
                  <dd>
                    {signal.locationMatch ? (
                      <Badge variant="success">Match</Badge>
                    ) : (
                      <Badge variant="muted">No match</Badge>
                    )}
                  </dd>
                  <dt className="text-sage-600">Work authorization</dt>
                  <dd>
                    {signal.workAuthMatch ? (
                      <Badge variant="success">Match</Badge>
                    ) : (
                      <Badge variant="muted">No match</Badge>
                    )}
                  </dd>
                  <dt className="text-sage-600">Candidate rating</dt>
                  <dd>
                    {signal.candidateRating > 0
                      ? `${signal.candidateRating.toFixed(2)} / 5`
                      : "Unrated"}
                  </dd>
                </dl>
              </CardBody>
            </Card>
          )}

          {submission.coverNote && (
            <Card>
              <CardHeader>
                <CardTitle>Cover note</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-sage-800 whitespace-pre-wrap">
                  {submission.coverNote}
                </p>
              </CardBody>
            </Card>
          )}

          {submission.proposedBillRate !== null && (
            <Card>
              <CardHeader>
                <CardTitle>Proposed bill rate</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-sage-800">
                  ${submission.proposedBillRate}/hour
                </p>
              </CardBody>
            </Card>
          )}

          {candidate && (
            <Card>
              <CardHeader>
                <CardTitle>Candidate profile</CardTitle>
              </CardHeader>
              <CardBody>
                <dl className="grid grid-cols-2 gap-y-3 text-sm">
                  <dt className="text-sage-600">Headline</dt>
                  <dd>{candidate.headline ?? "—"}</dd>
                  <dt className="text-sage-600">Seniority</dt>
                  <dd>{candidate.seniority ?? "—"}</dd>
                  <dt className="text-sage-600">Skills</dt>
                  <dd className="flex flex-wrap gap-1">
                    {candidate.skills.map((s) => (
                      <Badge key={s} variant="mint">
                        {s}
                      </Badge>
                    ))}
                  </dd>
                  <dt className="text-sage-600">Location</dt>
                  <dd>{candidate.location ?? "—"}</dd>
                  <dt className="text-sage-600">Work authorization</dt>
                  <dd>{candidate.workAuthStatus ?? "—"}</dd>
                  {candidate.resumeFileId && (
                    <>
                      <dt className="text-sage-600">Resume</dt>
                      <dd className="text-xs text-sage-600">
                        File {candidate.resumeFileId.slice(0, 8)}…
                      </dd>
                    </>
                  )}
                </dl>
              </CardBody>
            </Card>
          )}

          {submission.status === "WITHDRAWN" && submission.withdrawnReason && (
            <Card>
              <CardHeader>
                <CardTitle>Withdrawn</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm">{submission.withdrawnReason}</p>
                {submission.withdrawnAt && (
                  <p className="mt-1 text-xs text-sage-600">
                    {new Date(submission.withdrawnAt).toLocaleString()}
                  </p>
                )}
              </CardBody>
            </Card>
          )}

          {submission.status === "REJECTED" && submission.rejectionReason && (
            <Card>
              <CardHeader>
                <CardTitle>Rejection reason</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm">{submission.rejectionReason}</p>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {isOwner && submission.status === "OFFER" && (
            <Card className="border-success/30 bg-success/5">
              <CardHeader>
                <CardTitle>Ready to hire</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-xs text-sage-600 mb-3">
                  This candidate is at OFFER stage. Create the placement to activate the contract.
                </p>
                <Link href={`/submissions/${submission.id}/hire`} className="block">
                  <Button className="w-full">
                    Hire candidate →
                  </Button>
                </Link>
              </CardBody>
            </Card>
          )}

          {isOwner && submission.status !== "OFFER" && (
            <Card>
              <CardHeader>
                <CardTitle>Interview</CardTitle>
              </CardHeader>
              <CardBody>
                <Link href={`/submissions/${submission.id}/schedule-interview`} className="block">
                  <Button className="w-full" variant="primary">
                    Schedule interview
                  </Button>
                </Link>
              </CardBody>
            </Card>
          )}

          {isOwner && nextStatuses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Move forward</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2">
                {nextStatuses.map((s) => (
                  <Button
                    key={s}
                    className="w-full"
                    variant={s === "REJECTED" ? "secondary" : "primary"}
                    onClick={() => onStatusChange(s)}
                    disabled={working}
                  >
                    Move to {s.toLowerCase()}
                  </Button>
                ))}
              </CardBody>
            </Card>
          )}

          {canWithdraw && (
            <Card>
              <CardHeader>
                <CardTitle>Submitter actions</CardTitle>
              </CardHeader>
              <CardBody>
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={onWithdraw}
                  disabled={working}
                >
                  Withdraw submission
                </Button>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
