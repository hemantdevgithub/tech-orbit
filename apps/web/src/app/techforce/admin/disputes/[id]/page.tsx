"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import type { DisputeResponse, DisputeStatus } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { getAdminClient } from "@/lib/api-client";

const STATUS_PILL: Record<DisputeStatus, string> = {
  OPEN: "bg-warning/10 text-warning border-warning/30",
  UNDER_REVIEW: "bg-info/10 text-info border-info/30",
  RESOLVED: "bg-success/10 text-success border-success/30",
  CLOSED: "bg-surface-soft text-sage-500 border-surface-border",
};

function contextLinkFor(contextType: string, contextId: string): string | null {
  switch (contextType) {
    case "PLACEMENT":
      return `/techforce/placements/${contextId}`;
    case "COMMISSION_PAYOUT":
      return `/techforce/payouts/${contextId}`;
    case "TIMESHEET":
      return `/techforce/timesheets?open=${contextId}`;
    case "INVOICE":
      return `/techforce/invoices/${contextId}`;
    default:
      return null;
  }
}

export default function DisputeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [dispute, setDispute] = useState<DisputeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [resolution, setResolution] = useState("");
  const [resolving, setResolving] = useState(false);

  const load = useCallback(async () => {
    if (!params?.id) return;
    try {
      const d = await getAdminClient().getDispute(params.id);
      setDispute(d);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitNote() {
    if (!dispute || !note.trim()) return;
    setAddingNote(true);
    setError(null);
    try {
      await getAdminClient().addDisputeNote(dispute.id, { content: note.trim() });
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add note");
    } finally {
      setAddingNote(false);
    }
  }

  async function submitResolve() {
    if (!dispute || !resolution.trim()) return;
    setResolving(true);
    setError(null);
    try {
      await getAdminClient().resolveDispute(dispute.id, { resolution: resolution.trim() });
      router.push("/techforce/admin/disputes?resolved=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to resolve");
    } finally {
      setResolving(false);
    }
  }

  if (loading) return <p className="text-sage-500">Loading…</p>;
  if (error && !dispute) return <Card><CardBody className="text-danger">{error}</CardBody></Card>;
  if (!dispute) return null;

  const contextLink = contextLinkFor(dispute.contextType, dispute.contextId);
  const isResolved = dispute.status === "RESOLVED" || dispute.status === "CLOSED";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/techforce/admin/disputes" className="text-sm text-forest-700 hover:underline">
          ← All disputes
        </Link>
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-forest-900">{dispute.type} dispute</h1>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_PILL[dispute.status]}`}>
            {dispute.status}
          </span>
        </div>
        <p className="text-sage-500 text-sm mt-0.5">
          Created {new Date(dispute.createdAt).toLocaleString()}
        </p>
      </div>

      {error && <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>}

      <Card>
        <CardHeader><CardTitle>Dispute info</CardTitle></CardHeader>
        <CardBody className="space-y-2 text-sm">
          <Row label="Raised by" value={<code className="font-mono text-xs">{dispute.raisedBy}</code>} />
          {dispute.respondent && (
            <Row label="Respondent" value={<code className="font-mono text-xs">{dispute.respondent}</code>} />
          )}
          <Row
            label="Context"
            value={
              contextLink ? (
                <Link href={contextLink} className="text-forest-700 hover:underline">
                  {dispute.contextType} · {dispute.contextId.slice(0, 8)}…
                </Link>
              ) : (
                <span>{dispute.contextType} · <code className="font-mono text-xs">{dispute.contextId}</code></span>
              )
            }
          />
          <div className="pt-2 border-t border-surface-border">
            <p className="text-xs font-semibold text-sage-500 uppercase tracking-wider mb-1">Description</p>
            <p className="text-forest-900 whitespace-pre-wrap">{dispute.description}</p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          {dispute.notes.length === 0 ? (
            <p className="text-sage-500 text-sm">No notes yet.</p>
          ) : (
            <ul className="space-y-3">
              {dispute.notes.map((n) => (
                <li key={n.id} className="border-l-2 border-forest-100 pl-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs font-semibold text-sage-600 font-mono">{n.authorId.slice(0, 8)}…</p>
                    <span className="text-xs text-sage-500">{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-forest-900 mt-1 whitespace-pre-wrap">{n.content}</p>
                </li>
              ))}
            </ul>
          )}
          {!isResolved && (
            <div className="space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={4000}
                placeholder="Add a note…"
                className="w-full px-3 py-2 rounded-lg border border-surface-border bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm"
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={submitNote} disabled={addingNote || !note.trim()}>
                  {addingNote ? "Adding…" : "Add note"}
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {!isResolved ? (
        <Card>
          <CardHeader><CardTitle>Resolve</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="Resolution notes (required)…"
              className="w-full px-3 py-2 rounded-lg border border-surface-border bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm"
            />
            <div className="flex justify-end">
              <Button onClick={submitResolve} disabled={resolving || !resolution.trim()}>
                {resolving ? "Resolving…" : "Mark resolved"}
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Resolution</CardTitle></CardHeader>
          <CardBody className="text-sm space-y-1">
            <p className="text-forest-900 whitespace-pre-wrap">{dispute.resolution ?? "—"}</p>
            {dispute.resolvedAt && (
              <p className="text-xs text-sage-500 mt-2">
                Resolved by <code className="font-mono">{dispute.resolvedBy?.slice(0, 8)}…</code> on {new Date(dispute.resolvedAt).toLocaleString()}
              </p>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <dt className="text-sage-500 font-medium text-xs uppercase tracking-wider">{label}</dt>
      <dd className="col-span-2 text-forest-900">{value}</dd>
    </div>
  );
}
