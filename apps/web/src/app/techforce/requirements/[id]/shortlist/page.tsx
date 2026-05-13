"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Badge, Button, Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import type {
  RequirementResponse,
  SubmissionResponse,
  SubmissionStatus,
} from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { getMatchingClient, getRequirementClient } from "@/lib/api-client";

const COLUMNS: { id: SubmissionStatus; label: string }[] = [
  { id: "SUBMITTED", label: "Submitted" },
  { id: "SCREENING", label: "Screening" },
  { id: "INTERVIEWING", label: "Interviewing" },
  { id: "OFFER", label: "Offer" },
  { id: "PLACED", label: "Placed" },
  { id: "REJECTED", label: "Rejected" },
  { id: "WITHDRAWN", label: "Withdrawn" },
];

function scoreColor(score: number | null): string {
  if (score === null) return "bg-sage-200 text-sage-800";
  if (score >= 80) return "bg-mint-200 text-forest-900";
  if (score >= 50) return "bg-cream-200 text-forest-900";
  return "bg-red-100 text-red-900";
}

type DraggableCardProps = {
  submission: SubmissionResponse;
};

function DraggableCard({ submission }: DraggableCardProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: submission.id,
  });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`mb-2 cursor-grab rounded-md border border-sage-200 bg-white p-3 shadow-sm transition-opacity ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-forest-900">
            {submission.candidateId.slice(0, 8)}…
          </p>
          <p className="text-xs text-sage-600">
            {submission.submitterRole === "CANDIDATE_SELF"
              ? "Self-submission"
              : submission.submitterRole === "SRM"
                ? "Via SRM"
                : "Via MSME"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${scoreColor(
            submission.matchScore,
          )}`}
        >
          {submission.matchScore ?? "—"}
        </span>
      </div>
      <div className="mt-2 text-xs text-sage-600">
        <span>
          {new Date(submission.createdAt).toLocaleDateString()}
        </span>
        {submission.proposedBillRate !== null && (
          <>
            <span> · </span>
            <span>${submission.proposedBillRate}/hr</span>
          </>
        )}
      </div>
      <div className="mt-2">
        <Link
          href={`/techforce/submissions/${submission.id}`}
          className="text-xs text-forest-700 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          View details →
        </Link>
      </div>
    </div>
  );
}

function DroppableColumn({
  id,
  label,
  children,
  count,
}: {
  id: SubmissionStatus;
  label: string;
  children: React.ReactNode;
  count: number;
}): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-w-[220px] shrink-0 rounded-md bg-sage-50 p-3 transition-colors ${
        isOver ? "bg-mint-100" : ""
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-forest-900">{label}</h3>
        <Badge variant="muted">{count}</Badge>
      </div>
      {children}
    </div>
  );
}

export default function ShortlistPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const [req, setReq] = useState<RequirementResponse | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 4 },
  }));

  const load = useCallback(async () => {
    if (!params?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [reqData, subList] = await Promise.all([
        getRequirementClient().getById(params.id),
        getMatchingClient().listSubmissions({ requirementId: params.id, limit: 100 }),
      ]);
      setReq(reqData);
      setSubmissions(subList.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load shortlist");
    } finally {
      setLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const map: Record<SubmissionStatus, SubmissionResponse[]> = {
      SUBMITTED: [],
      SCREENING: [],
      INTERVIEWING: [],
      OFFER: [],
      PLACED: [],
      REJECTED: [],
      WITHDRAWN: [],
    };
    for (const s of submissions) map[s.status].push(s);
    return map;
  }, [submissions]);

  async function onDragEnd(event: DragEndEvent): Promise<void> {
    const { active, over } = event;
    if (!over) return;
    const submissionId = String(active.id);
    const targetStatus = String(over.id) as SubmissionStatus;

    const current = submissions.find((s) => s.id === submissionId);
    if (!current || current.status === targetStatus) return;

    // Optimistic update
    setSubmissions((prev) =>
      prev.map((s) => (s.id === submissionId ? { ...s, status: targetStatus } : s)),
    );
    setNotice(null);
    try {
      await getMatchingClient().updateStatus(submissionId, {
        status: targetStatus,
      });
      setNotice(`Moved to ${targetStatus.toLowerCase()}.`);
    } catch (err) {
      // Revert on failure
      setSubmissions((prev) =>
        prev.map((s) => (s.id === submissionId ? current : s)),
      );
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to update submission status",
      );
    }
  }

  if (loading) return <p className="text-sage-600">Loading shortlist…</p>;
  if (error && !req) {
    return (
      <Card>
        <CardBody className="text-red-700">{error}</CardBody>
      </Card>
    );
  }
  if (!req) return <p>Not found.</p>;

  return (
    <div>
      <div className="mb-4">
        <Link
          href={`/techforce/requirements/${req.id}`}
          className="text-sm text-forest-700 hover:underline"
        >
          ← Back to requirement
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-forest-900">
            Shortlist: {req.title}
          </h1>
          <p className="text-sage-600 text-sm">
            {submissions.length} submission{submissions.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {notice && (
        <div className="mb-3 p-3 rounded bg-mint-200 text-forest-900 text-sm">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-3 p-3 rounded bg-red-50 text-red-800 text-sm">
          {error}
        </div>
      )}

      {submissions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No submissions yet</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sage-700 text-sm mb-3">
              Once candidates, SRMs, or MSMEs submit to this requirement,
              their submissions will show up here.
            </p>
            <Link href={`/techforce/requirements/${req.id}`}>
              <Button variant="secondary">Back to requirement</Button>
            </Link>
          </CardBody>
        </Card>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-3">
            {COLUMNS.map((col) => (
              <DroppableColumn
                key={col.id}
                id={col.id}
                label={col.label}
                count={grouped[col.id].length}
              >
                {grouped[col.id].map((s) => (
                  <DraggableCard key={s.id} submission={s} />
                ))}
                {grouped[col.id].length === 0 && (
                  <p className="text-xs text-sage-500 italic">Empty</p>
                )}
              </DroppableColumn>
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
}
