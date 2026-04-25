"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import type { InterviewResponse } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { useAuthStore } from "@/store/auth.store";
import { getInterviewClient, getProfileClient } from "@/lib/api-client";
import { Breadcrumbs } from "@/components/breadcrumbs";

const FEATURED_CAP = 6;

export default function FeaturedInterviewsSettingsPage(): JSX.Element {
  const { user } = useAuthStore();
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [interviews, setInterviews] = useState<InterviewResponse[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const profile = await getProfileClient().getCandidateProfile();
      setCandidateId(profile.userId);
      setSelected(profile.featuredInterviewIds);

      // Only the candidate's own interviews are visible via list — no filter
      // needed since the service layer scopes to participant.
      const list = await getInterviewClient().list({
        candidateId: profile.userId,
        limit: 100,
      });
      setInterviews(list.data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to load your interviews",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const eligible = useMemo(
    () =>
      interviews.filter(
        (iv) => iv.status === "COMPLETED" && iv.videoRecordingStatus === "READY",
      ),
    [interviews],
  );

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggle(id: string): void {
    setError(null);
    setNotice(null);
    if (selectedSet.has(id)) {
      setSelected(selected.filter((x) => x !== id));
    } else {
      if (selected.length >= FEATURED_CAP) {
        setError(`You can feature up to ${FEATURED_CAP} interviews.`);
        return;
      }
      setSelected([...selected, id]);
    }
  }

  function move(id: string, delta: -1 | 1): void {
    const idx = selected.indexOf(id);
    if (idx === -1) return;
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= selected.length) return;
    const next = [...selected];
    [next[idx], next[nextIdx]] = [next[nextIdx]!, next[idx]!];
    setSelected(next);
  }

  async function onSave(): Promise<void> {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await getProfileClient().setFeaturedInterviews({ interviewIds: selected });
      setNotice("Featured interviews updated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return <p>Please sign in.</p>;
  if (loading) return <p className="text-sage-600">Loading your interviews…</p>;

  const orderedSelected = selected
    .map((id) => eligible.find((iv) => iv.id === id))
    .filter((iv): iv is InterviewResponse => iv !== undefined);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Settings", href: "/settings/profile" },
          { label: "Featured interviews" },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold text-forest-900">Featured interviews</h1>
        <p className="text-sage-700 text-sm mt-1">
          Pick up to {FEATURED_CAP} completed interviews to showcase on your
          public profile. Customers will see the recording and score.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded bg-red-50 text-red-800 text-sm">{error}</div>
      )}
      {notice && (
        <div className="p-3 rounded bg-mint-200 text-forest-900 text-sm">{notice}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Selected ({selected.length}/{FEATURED_CAP})
          </CardTitle>
        </CardHeader>
        <CardBody>
          {orderedSelected.length === 0 ? (
            <p className="text-sage-500 text-sm">
              No interviews featured yet. Pick from eligible interviews below.
            </p>
          ) : (
            <ul className="space-y-2">
              {orderedSelected.map((iv, idx) => (
                <li
                  key={iv.id}
                  className="flex items-center justify-between gap-3 p-3 rounded border border-sage-200"
                >
                  <div>
                    <p className="text-sm font-medium text-forest-900">
                      {new Date(iv.scheduledStart).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-sage-600 mt-0.5">
                      Order: {idx + 1}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => move(iv.id, -1)}
                      disabled={idx === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => move(iv.id, 1)}
                      disabled={idx === orderedSelected.length - 1}
                    >
                      ↓
                    </Button>
                    <Button variant="secondary" onClick={() => toggle(iv.id)}>
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex justify-end">
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eligible interviews</CardTitle>
        </CardHeader>
        <CardBody>
          {eligible.length === 0 ? (
            <p className="text-sage-500 text-sm">
              No completed interviews with ready recordings yet. Once your
              interviews finish processing they'll show up here.
            </p>
          ) : (
            <ul className="space-y-2">
              {eligible.map((iv) => {
                const checked = selectedSet.has(iv.id);
                return (
                  <li
                    key={iv.id}
                    className="flex items-center justify-between gap-3 p-3 rounded border border-sage-200"
                  >
                    <div>
                      <p className="text-sm font-medium text-forest-900">
                        {new Date(iv.scheduledStart).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="muted">
                          {iv.conductedByRole === "PLATFORM_INTERVIEWER"
                            ? "Techorbit"
                            : "Customer"}
                        </Badge>
                        {iv.videoRecordingDurationSec !== null && (
                          <span className="text-xs text-sage-600">
                            {Math.floor(iv.videoRecordingDurationSec / 60)}m{" "}
                            {iv.videoRecordingDurationSec % 60}s
                          </span>
                        )}
                        <Link
                          href={`/interviews/${iv.id}`}
                          className="text-xs text-forest-700 hover:underline"
                        >
                          View →
                        </Link>
                      </div>
                    </div>
                    <Button
                      variant={checked ? "secondary" : "primary"}
                      onClick={() => toggle(iv.id)}
                    >
                      {checked ? "Remove" : "Feature"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      {candidateId && (
        <p className="text-sm text-sage-600">
          Preview:{" "}
          <Link
            href={`/candidates/${candidateId}`}
            className="text-forest-700 hover:underline"
          >
            See how your public profile looks →
          </Link>
        </p>
      )}
    </div>
  );
}
