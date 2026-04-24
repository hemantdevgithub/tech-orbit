"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardBody, CardHeader, CardTitle, StarRating } from "@techorbit/ui";
import type { PlacementResponse } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { useAuthStore } from "@/store/auth.store";
import { getPlacementClient, getRatingClient } from "@/lib/api-client";

export default function RatePlacementPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [placement, setPlacement] = useState<PlacementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [overall, setOverall] = useState<number>(0);
  const [technical, setTechnical] = useState<number | null>(null);
  const [communication, setCommunication] = useState<number | null>(null);
  const [professionalism, setProfessionalism] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!params?.id) return;
    getPlacementClient()
      .getById(params.id)
      .then(setPlacement)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Failed to load placement"),
      )
      .finally(() => setLoading(false));
  }, [params?.id]);

  const isCustomer = placement && user && placement.createdByUserId === user.id;
  const isCandidate = placement && user && placement.candidateId === user.id;
  const ratedUserId = isCustomer ? placement?.candidateId : placement?.createdByUserId;
  const raterRoleLabel = isCustomer ? "candidate" : "customer";

  async function submit() {
    if (!placement || !ratedUserId || overall < 1) return;
    setSubmitting(true);
    setError(null);
    try {
      await getRatingClient().submit({
        placementId: placement.id,
        ratedUserId,
        overallScore: overall,
        technicalScore: isCustomer ? (technical ?? undefined) : undefined,
        communicationScore: communication ?? undefined,
        professionalismScore: professionalism ?? undefined,
        feedback: feedback.trim() || undefined,
      });
      router.push(`/placements/${placement.id}?rated=1`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sage-500 p-8">Loading…</p>;
  if (error || !placement) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <Card>
          <CardBody className="text-danger">{error ?? "Placement not found"}</CardBody>
        </Card>
      </div>
    );
  }

  if (!isCustomer && !isCandidate) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <Card>
          <CardBody className="text-sage-600">
            Only the customer or candidate on this placement can submit a rating.
          </CardBody>
        </Card>
      </div>
    );
  }

  if (placement.status !== "ENDED_COMPLETED") {
    return (
      <div className="max-w-2xl mx-auto p-8 space-y-4">
        <Link href={`/placements/${placement.id}`} className="text-sm text-forest-700 hover:underline">
          ← Back to placement
        </Link>
        <Card>
          <CardHeader><CardTitle>Rating not yet available</CardTitle></CardHeader>
          <CardBody>
            <p className="text-sage-600 text-sm">
              Ratings can be submitted once the placement completes successfully.
              Current status: <span className="font-semibold">{placement.status}</span>.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <div>
        <Link href={`/placements/${placement.id}`} className="text-sm text-forest-700 hover:underline">
          ← Back to placement
        </Link>
        <h1 className="text-2xl font-bold text-forest-900 mt-2">Rate this {raterRoleLabel}</h1>
        <p className="text-sage-500 text-sm mt-0.5">
          Your rating is public. Stars are required; the rest is optional.
        </p>
      </div>

      {error && <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>}

      <Card>
        <CardHeader><CardTitle>Overall rating</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          <div>
            <p className="text-sm text-sage-600 mb-2">How was the engagement overall?</p>
            <StarRating value={overall || null} onChange={setOverall} size="lg" aria-label="Overall rating" />
          </div>
          {isCustomer && (
            <div>
              <p className="text-sm text-sage-600 mb-2">Technical skills</p>
              <StarRating value={technical} onChange={setTechnical} aria-label="Technical rating" />
            </div>
          )}
          <div>
            <p className="text-sm text-sage-600 mb-2">Communication</p>
            <StarRating value={communication} onChange={setCommunication} aria-label="Communication rating" />
          </div>
          <div>
            <p className="text-sm text-sage-600 mb-2">Professionalism</p>
            <StarRating value={professionalism} onChange={setProfessionalism} aria-label="Professionalism rating" />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Written feedback <span className="text-sage-500 text-xs font-normal">(optional)</span></CardTitle></CardHeader>
        <CardBody>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Share details that would help others…"
            className="w-full px-3 py-2 rounded-lg border border-surface-border bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm"
          />
          <p className="text-xs text-sage-500 mt-1">{feedback.length}/500 characters</p>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={submitting || overall < 1}>
          {submitting ? "Submitting…" : "Submit rating"}
        </Button>
      </div>
    </div>
  );
}
