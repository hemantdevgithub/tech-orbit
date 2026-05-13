"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardBody, CardHeader, CardTitle, Label } from "@techorbit/ui";
import type { InterviewResponse, Recommendation } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { useAuthStore } from "@/store/auth.store";
import { getInterviewClient } from "@/lib/api-client";

const RECOMMENDATIONS: { value: Recommendation; label: string; color: string }[] = [
  { value: "STRONG_YES", label: "Strong Yes", color: "text-forest-700" },
  { value: "YES", label: "Yes", color: "text-mint-700" },
  { value: "WEAK_YES", label: "Weak Yes", color: "text-sage-600" },
  { value: "WEAK_NO", label: "Weak No", color: "text-yellow-700" },
  { value: "NO", label: "No", color: "text-orange-700" },
  { value: "STRONG_NO", label: "Strong No", color: "text-red-700" },
];

function StarRating({
  label, value, onChange, disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            className={`text-2xl ${star <= value ? "text-yellow-400" : "text-sage-300"} hover:text-yellow-300 disabled:cursor-not-allowed`}
          >
            ★
          </button>
        ))}
        {value > 0 && (
          <button type="button" disabled={disabled} onClick={() => onChange(0)} className="text-xs text-sage-500 ml-1 self-center">
            clear
          </button>
        )}
      </div>
    </div>
  );
}

export default function ScorecardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [iv, setIv] = useState<InterviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [recommendation, setRecommendation] = useState<Recommendation>("YES");
  const [technical, setTechnical] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [problemSolving, setProblemSolving] = useState(0);
  const [culturalFit, setCulturalFit] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [redFlags, setRedFlags] = useState("");
  const [wouldHire, setWouldHire] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    getInterviewClient()
      .getById(params.id)
      .then(setIv)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [params?.id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!iv || !params?.id) return;
    if (!feedback.trim()) { setSubmitError("Freeform feedback is required."); return; }

    setSubmitError(null);
    setSubmitting(true);
    try {
      await getInterviewClient().submitScorecard({
        interviewId: iv.id,
        recommendation,
        technicalScore: technical > 0 ? technical : undefined,
        communicationScore: communication > 0 ? communication : undefined,
        problemSolvingScore: problemSolving > 0 ? problemSolving : undefined,
        culturalFitScore: culturalFit > 0 ? culturalFit : undefined,
        freeformFeedback: feedback.trim(),
        redFlags: redFlags.trim() || undefined,
        wouldHireAgain: wouldHire ?? undefined,
      });
      router.push(`/techforce/interviews/${iv.id}?scorecard_submitted=1`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Failed to submit scorecard");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sage-600">Loading…</p>;
  if (loadError || !iv) return <Card><CardBody className="text-red-700">{loadError ?? "Not found"}</CardBody></Card>;

  const isAllowed = user?.id === iv.scheduledByUserId || user?.id === iv.interviewerUserId;
  if (!isAllowed) {
    return <Card><CardBody><p className="text-sage-700">Only the interviewer or scheduler can submit a scorecard.</p></CardBody></Card>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link href={`/techforce/interviews/${iv.id}`} className="text-sm text-forest-700 hover:underline">
          ← Back to interview
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-forest-900 mb-6">Submit scorecard</h1>

      <Card>
        <CardHeader><CardTitle>Assessment</CardTitle></CardHeader>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-5">
            {/* Recommendation */}
            <div>
              <Label>Recommendation</Label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {RECOMMENDATIONS.map(({ value, label, color }) => (
                  <label key={value} className={`flex items-center gap-2 cursor-pointer rounded border p-2 text-sm ${recommendation === value ? "border-forest-600 bg-forest-50" : "border-sage-200"}`}>
                    <input type="radio" name="recommendation" value={value} checked={recommendation === value} onChange={() => setRecommendation(value)} className="sr-only" />
                    <span className={`font-medium ${color}`}>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Scores */}
            <StarRating label="Technical score" value={technical} onChange={setTechnical} disabled={submitting} />
            <StarRating label="Communication" value={communication} onChange={setCommunication} disabled={submitting} />
            <StarRating label="Problem solving" value={problemSolving} onChange={setProblemSolving} disabled={submitting} />
            <StarRating label="Cultural fit" value={culturalFit} onChange={setCulturalFit} disabled={submitting} />

            {/* Freeform */}
            <div>
              <Label htmlFor="feedback">Feedback <span className="text-red-600">*</span></Label>
              <textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={5}
                maxLength={2000}
                required
                disabled={submitting}
                className="mt-1 w-full rounded-md border border-sage-300 p-2 text-sm"
                placeholder="Detailed assessment of the candidate's performance…"
              />
              <p className="text-xs text-sage-500 text-right">{feedback.length}/2000</p>
            </div>

            <div>
              <Label htmlFor="redFlags">Red flags (optional)</Label>
              <textarea
                id="redFlags"
                value={redFlags}
                onChange={(e) => setRedFlags(e.target.value)}
                rows={2}
                maxLength={1000}
                disabled={submitting}
                className="mt-1 w-full rounded-md border border-sage-300 p-2 text-sm"
                placeholder="Any concerns…"
              />
            </div>

            <div>
              <Label>Would you hire this candidate again?</Label>
              <div className="mt-2 flex gap-4">
                {[{ v: true, label: "Yes" }, { v: false, label: "No" }].map(({ v, label }) => (
                  <label key={String(v)} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="wouldHire" checked={wouldHire === v} onChange={() => setWouldHire(v)} />
                    {label}
                  </label>
                ))}
                <label className="flex items-center gap-2 text-sm cursor-pointer text-sage-500">
                  <input type="radio" name="wouldHire" checked={wouldHire === null} onChange={() => setWouldHire(null)} />
                  Prefer not to answer
                </label>
              </div>
            </div>

            {submitError && (
              <div className="p-3 rounded bg-red-50 text-red-800 text-sm">{submitError}</div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit scorecard"}
              </Button>
              <Link href={`/techforce/interviews/${iv.id}`}>
                <Button type="button" variant="secondary" disabled={submitting}>Cancel</Button>
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
