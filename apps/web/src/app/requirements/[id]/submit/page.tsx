"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@techorbit/ui";
import type { RequirementResponse } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { useAuthStore } from "@/store/auth.store";
import {
  getMatchingClient,
  getRequirementClient,
} from "@/lib/api-client";

function pickSubmitterRole(
  roles: string[],
): "CANDIDATE_SELF" | "SRM" | "MSME" | null {
  if (roles.includes("SRM")) return "SRM";
  if (roles.includes("MSME")) return "MSME";
  if (roles.includes("CANDIDATE") || roles.includes("ADMIN")) {
    return "CANDIDATE_SELF";
  }
  return null;
}

export default function SubmitCandidatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [req, setReq] = useState<RequirementResponse | null>(null);
  const [loadingReq, setLoadingReq] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [candidateId, setCandidateId] = useState("");
  const [coverNote, setCoverNote] = useState("");
  const [proposedBillRate, setProposedBillRate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    setLoadingReq(true);
    getRequirementClient()
      .getById(params.id)
      .then((data) => {
        setReq(data);
      })
      .catch((err) => {
        setLoadError(
          err instanceof ApiError ? err.message : "Failed to load requirement",
        );
      })
      .finally(() => setLoadingReq(false));
  }, [params?.id]);

  const roleNames = user?.roles?.map((r) => r.roleType) ?? [];
  const submitterRole = pickSubmitterRole(roleNames);

  // Pre-fill candidate ID if caller is self-submitting.
  useEffect(() => {
    if (submitterRole === "CANDIDATE_SELF" && user?.id) {
      setCandidateId(user.id);
    }
  }, [submitterRole, user?.id]);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!req || !params?.id) return;

    setSubmitError(null);
    setSubmitting(true);
    try {
      const submission = await getMatchingClient().createSubmission({
        requirementId: params.id,
        candidateId: candidateId.trim(),
        coverNote: coverNote.trim() || undefined,
        proposedBillRate: proposedBillRate
          ? Number(proposedBillRate)
          : undefined,
      });
      router.push(`/submissions/${submission.id}?just_submitted=1`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setSubmitError(
            "You've already submitted this candidate to this requirement.",
          );
        } else {
          setSubmitError(err.message);
        }
      } else {
        setSubmitError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingReq) {
    return <p className="text-sage-600">Loading requirement…</p>;
  }
  if (loadError || !req) {
    return (
      <Card>
        <CardBody className="text-red-700">
          {loadError ?? "Requirement not found"}
        </CardBody>
      </Card>
    );
  }
  if (req.status !== "OPEN") {
    return (
      <Card>
        <CardBody>
          <p className="text-sage-700">
            This requirement is not open for submissions (current status:{" "}
            <strong>{req.status}</strong>).
          </p>
          <Link
            href={`/requirements/${req.id}`}
            className="text-forest-700 hover:underline text-sm"
          >
            ← Back to requirement
          </Link>
        </CardBody>
      </Card>
    );
  }
  if (!submitterRole) {
    return (
      <Card>
        <CardBody>
          <p className="text-sage-700">
            Your account cannot submit candidates. Only candidates, SRMs, and
            MSMEs can submit.
          </p>
        </CardBody>
      </Card>
    );
  }

  const canEditCandidateId = submitterRole !== "CANDIDATE_SELF";

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link
          href={`/requirements/${req.id}`}
          className="text-sm text-forest-700 hover:underline"
        >
          ← Back to requirement
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-forest-900 mb-1">
        Submit candidate
      </h1>
      <p className="text-sage-600 mb-6">
        Submitting to: <strong>{req.title}</strong>
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Submission details</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="candidateId">Candidate user ID</Label>
              <Input
                id="candidateId"
                value={candidateId}
                onChange={(e) => setCandidateId(e.target.value)}
                disabled={!canEditCandidateId || submitting}
                placeholder="UUID of the candidate"
                required
              />
              {!canEditCandidateId && (
                <p className="mt-1 text-xs text-sage-600">
                  Candidates can only submit themselves.
                </p>
              )}
              {canEditCandidateId && (
                <p className="mt-1 text-xs text-sage-600">
                  Paste the candidate&apos;s user ID. Proper candidate picker
                  lands in Sprint 5.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="coverNote">Cover note (optional)</Label>
              <textarea
                id="coverNote"
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                maxLength={500}
                rows={5}
                disabled={submitting}
                className="w-full rounded-md border border-sage-300 p-2 text-sm"
                placeholder="A short note to the customer (max 500 chars)"
              />
              <p className="mt-1 text-xs text-sage-600">
                {coverNote.length}/500
              </p>
            </div>

            <div>
              <Label htmlFor="proposedBillRate">
                Proposed bill rate (USD/hr, optional)
              </Label>
              <Input
                id="proposedBillRate"
                type="number"
                step="0.01"
                min="0"
                max="10000"
                value={proposedBillRate}
                onChange={(e) => setProposedBillRate(e.target.value)}
                disabled={submitting}
                placeholder={`${req.billRateMinUsd}–${req.billRateMaxUsd}`}
              />
            </div>

            {submitError && (
              <div className="p-3 rounded bg-red-50 text-red-800 text-sm">
                {submitError}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit"}
              </Button>
              <Link href={`/requirements/${req.id}`}>
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
