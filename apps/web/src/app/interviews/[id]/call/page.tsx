"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardBody } from "@techorbit/ui";
import type { InterviewResponse } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { useAuthStore } from "@/store/auth.store";
import { getInterviewClient } from "@/lib/api-client";

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
    <div className="flex h-screen flex-col bg-forest-950">
      {/* Top bar */}
      <div className="flex items-center justify-between bg-forest-900 px-4 py-2 text-cream-100">
        <div>
          <p className="text-sm font-semibold">Interview — {iv.candidateId.slice(0, 8)}…</p>
          <p className="text-xs text-sage-400">
            {new Date(iv.scheduledStart).toLocaleString()} –{" "}
            {new Date(iv.scheduledEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <Link href={`/interviews/${iv.id}`} className="text-xs text-sage-400 hover:text-cream-100">
          ← Details
        </Link>
      </div>

      {/* Video iframe */}
      {!joined ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-forest-950 text-cream-100">
          <p className="text-lg font-semibold">Ready to join?</p>
          <p className="text-sm text-sage-400">Camera and microphone will be requested by Daily.co.</p>
          <Button onClick={onJoin}>Join now</Button>
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
