"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardBody } from "@techorbit/ui";
import type { InterviewResponse } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { useAuthStore } from "@/store/auth.store";
import { getInterviewClient } from "@/lib/api-client";
import { useDisplayName } from "@/lib/display-names";

export default function VideoCallPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuthStore();

  const [iv, setIv] = useState<InterviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [ended, setEnded] = useState(false);

  const load = useCallback(async () => {
    if (!params?.id) return;
    setLoading(true);
    try {
      const data = await getInterviewClient().getById(params.id);
      setIv(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load interview");
    } finally {
      setLoading(false);
    }
  }, [params?.id]);

  useEffect(() => { void load(); }, [load]);

  async function onJoin() {
    if (!iv) return;
    setJoined(true);
    try {
      const updated = await getInterviewClient().start(iv.id);
      setIv(updated);
    } catch {
      // non-fatal — interview may already be IN_PROGRESS
    }
  }

  async function onLeave() {
    if (!iv) return;
    setEnded(true);
    try {
      const updated = await getInterviewClient().end(iv.id);
      setIv(updated);
    } catch {
      // non-fatal
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><p className="text-sage-600">Loading interview…</p></div>;
  if (error || !iv) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card>
          <CardBody>
            <p className="text-red-700">{error ?? "Interview not found"}</p>
            <Link href={`/interviews/${params?.id ?? ""}`} className="mt-2 block text-sm text-forest-700 hover:underline">
              ← Back to interview
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  const isParticipant =
    user?.id === iv.scheduledByUserId ||
    user?.id === iv.candidateId ||
    user?.id === iv.interviewerUserId;

  if (!isParticipant) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card>
          <CardBody>
            <p className="text-sage-700">You are not a participant in this interview.</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!iv.videoRoomUrl) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card>
          <CardBody>
            <p className="text-sage-700">Video room is not ready yet. Please refresh in a moment.</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (ended) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-forest-900 text-lg font-semibold">Interview ended.</p>
        <Link href={`/interviews/${iv.id}`}>
          <Button>Back to interview</Button>
        </Link>
        {(user?.id === iv.scheduledByUserId || user?.id === iv.interviewerUserId) && (
          <Link href={`/interviews/${iv.id}/scorecard`}>
            <Button variant="secondary">Submit scorecard</Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-surface-border bg-forest-900 flex flex-col" style={{ minHeight: "70vh" }}>
      <CallTopBar iv={iv} />


      {/* Video iframe — or a friendly placeholder when the room is a Daily.co
          mock URL (so the demo doesn't show a broken "meeting not found" page) */}
      {!joined ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-forest-900 text-cream-100 py-12">
          <p className="text-lg font-semibold">Ready to join?</p>
          <p className="text-sm text-sage-400">Camera and microphone will be requested by Daily.co.</p>
          <Button onClick={onJoin}>Join now</Button>
        </div>
      ) : iv.videoRoomUrl?.includes("mock.daily.co") ? (
        <div className="flex flex-1 flex-col items-center justify-center bg-forest-900 text-cream-100 gap-3 px-6 text-center py-12">
          <div className="w-20 h-20 rounded-full bg-forest-800 border-2 border-forest-700 flex items-center justify-center text-3xl">
            🎥
          </div>
          <p className="text-lg font-semibold">Mock video session</p>
          <p className="text-sm text-sage-400 max-w-md">
            The platform is using the Daily.co mock provider. In production this
            embeds the real Daily.co room. For the demo, treat the meeting as
            in progress — when you click <strong className="text-cream-100">End call</strong> the
            backend marks the interview as completed and the scorecard becomes
            available.
          </p>
          <p className="text-xs text-sage-500 font-mono mt-2 break-all max-w-lg">
            {iv.videoRoomUrl}
          </p>
        </div>
      ) : (
        <iframe
          src={iv.videoRoomUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="flex-1"
          title="Interview video room"
        />
      )}

      {/* Bottom bar */}
      {joined && (
        <div className="flex items-center justify-center gap-4 bg-forest-900 py-3">
          <Button variant="secondary" onClick={onLeave}>
            End call
          </Button>
        </div>
      )}
    </div>
  );
}

function CallTopBar({ iv }: { iv: InterviewResponse }) {
  const candidateName = useDisplayName(iv.candidateId, "candidate");
  const interviewerName = useDisplayName(iv.interviewerUserId ?? null, "interviewer");
  return (
    <div className="flex items-center justify-between bg-forest-900 px-4 py-2 text-cream-100">
      <div>
        <p className="text-sm font-semibold">
          {candidateName}
          {iv.interviewerUserId && <> ↔ {interviewerName}</>}
        </p>
        <p className="text-xs text-sage-400">
          {new Date(iv.scheduledStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {" · "}
          {new Date(iv.scheduledStart).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} –{" "}
          {new Date(iv.scheduledEnd).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </p>
      </div>
      <Link href={`/interviews/${iv.id}`} className="text-xs text-sage-400 hover:text-cream-100">
        ← Details
      </Link>
    </div>
  );
}
