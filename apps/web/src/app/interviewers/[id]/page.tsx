"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge, Button, Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import type { InterviewerProfileResponse } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { getProfileClient } from "@/lib/api-client";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default function InterviewerDetailPage() {
  const params = useParams<{ id: string }>();
  const [iv, setIv] = useState<InterviewerProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    getProfileClient()
      .getInterviewerByUserId(params.id)
      .then(setIv)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Not found"))
      .finally(() => setLoading(false));
  }, [params?.id]);

  if (loading) return <p className="text-sage-600">Loading…</p>;
  if (error || !iv) return <Card><CardBody className="text-red-700">{error ?? "Not found"}</CardBody></Card>;

  return (
    <div className="max-w-3xl">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Interviewers", href: "/interviewers" },
          { label: iv.displayName ?? "Interviewer" },
        ]}
      />

      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-forest-900">{iv.displayName ?? "Interviewer"}</h1>
            {iv.headline && <p className="text-sage-600 mt-1">{iv.headline}</p>}
          </div>
          {iv.perInterviewFeeUsd !== null && (
            <p className="text-lg font-semibold text-forest-900 shrink-0">${iv.perInterviewFeeUsd}/interview</p>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {iv.linkedinVerified && <Badge variant="success">LinkedIn Verified</Badge>}
          <Badge variant="muted">{iv.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          {iv.bio && (
            <Card>
              <CardHeader><CardTitle>Bio</CardTitle></CardHeader>
              <CardBody><p className="text-sm text-sage-800 whitespace-pre-wrap">{iv.bio}</p></CardBody>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Expertise</CardTitle></CardHeader>
            <CardBody>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-sage-600 mb-1">Specializations</dt>
                  <dd className="flex flex-wrap gap-1">
                    {iv.specializations.length ? iv.specializations.map((s) => <Badge key={s} variant="mint">{s}</Badge>) : <span className="text-sage-500">—</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-sage-600 mb-1">Seniority levels</dt>
                  <dd className="flex flex-wrap gap-1">
                    {iv.seniorityLevelsCoverable.map((s) => <Badge key={s} variant="cream">{s}</Badge>)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sage-600 mb-1">Interview types</dt>
                  <dd className="flex flex-wrap gap-1">
                    {iv.interviewTypes.map((t) => <Badge key={t} variant="muted">{t.replace("_", " ")}</Badge>)}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          {iv.availabilitySlots.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Upcoming availability</CardTitle></CardHeader>
              <CardBody>
                <ul className="space-y-1 text-sm">
                  {iv.availabilitySlots.slice(0, 5).map((slot, i) => (
                    <li key={i} className="text-sage-700">
                      {slot.date} · {slot.startTime}–{slot.endTime} ({slot.timezone})
                    </li>
                  ))}
                  {iv.availabilitySlots.length > 5 && (
                    <li className="text-sage-500 text-xs">+{iv.availabilitySlots.length - 5} more slots</li>
                  )}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          <Card>
            <CardHeader><CardTitle>Book this interviewer</CardTitle></CardHeader>
            <CardBody>
              <p className="text-xs text-sage-600 mb-3">
                Use their user ID <code className="bg-sage-100 px-1 py-0.5 rounded text-xs">{iv.userId}</code> when scheduling an interview.
              </p>
              <Button className="w-full" onClick={() => { navigator.clipboard.writeText(iv.userId); }}>
                Copy user ID
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
