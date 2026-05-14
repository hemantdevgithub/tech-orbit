"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import type { RoleApplicationResponse } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { getAdminClient } from "@/lib/api-client";

export default function RoleApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [app, setApp] = useState<RoleApplicationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    getAdminClient()
      .getApplication(params.id)
      .then(setApp)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [params?.id]);

  async function onApprove() {
    if (!app) return;
    setWorking(true);
    setError(null);
    setAction("approve");
    try {
      await getAdminClient().approveApplication(app.id, { reviewNotes: notes.trim() || undefined });
      router.push("/techforce/admin/role-applications?approved=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to approve");
      setAction(null);
    } finally {
      setWorking(false);
    }
  }

  async function onReject() {
    if (!app) return;
    if (!notes.trim()) {
      setError("Review notes are required when rejecting.");
      return;
    }
    setWorking(true);
    setError(null);
    setAction("reject");
    try {
      await getAdminClient().rejectApplication(app.id, { reviewNotes: notes.trim() });
      router.push("/techforce/admin/role-applications?rejected=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reject");
      setAction(null);
    } finally {
      setWorking(false);
    }
  }

  if (loading) return <p className="text-sage-500">Loading…</p>;
  if (error && !app) return <Card><CardBody className="text-danger">{error}</CardBody></Card>;
  if (!app) return null;

  const isPending = app.status === "PENDING";
  const dataEntries = Object.entries(app.applicationData);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/techforce/admin/role-applications" className="text-sm text-forest-700 hover:underline">
          ← All applications
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-forest-900 mt-2">
          {app.requestedRole} application
        </h1>
        <p className="text-sage-500 text-sm mt-0.5 font-mono">{app.userId}</p>
      </div>

      {error && <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>}

      <Card>
        <CardHeader><CardTitle>Application data</CardTitle></CardHeader>
        <CardBody>
          {dataEntries.length === 0 ? (
            <p className="text-sage-500 text-sm">No application data provided.</p>
          ) : (
            <dl className="space-y-2 text-sm">
              {dataEntries.map(([k, v]) => (
                <div key={k} className="grid grid-cols-3 gap-3">
                  <dt className="text-sage-500 font-medium">{k}</dt>
                  <dd className="col-span-2 text-forest-900 break-words">
                    {typeof v === "string" ? v : <code className="font-mono text-xs">{JSON.stringify(v)}</code>}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </CardBody>
      </Card>

      {app.reviewedAt && (
        <Card>
          <CardHeader><CardTitle>Review</CardTitle></CardHeader>
          <CardBody className="text-sm space-y-1">
            <p className="text-sage-600">
              <span className="font-semibold">Status:</span> {app.status}
            </p>
            <p className="text-sage-600">
              <span className="font-semibold">Reviewed by:</span> <span className="font-mono text-xs">{app.reviewedBy}</span>
            </p>
            <p className="text-sage-600">
              <span className="font-semibold">Reviewed at:</span> {new Date(app.reviewedAt).toLocaleString()}
            </p>
            {app.reviewNotes && (
              <p className="text-forest-900 mt-2 whitespace-pre-wrap">{app.reviewNotes}</p>
            )}
          </CardBody>
        </Card>
      )}

      {isPending && (
        <Card>
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-sage-600 mb-1">
                Review notes <span className="text-sage-400">(required when rejecting)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Notes visible to the applicant…"
                className="w-full px-3 py-2 rounded-lg border border-surface-border bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={onApprove} disabled={working}>
                {working && action === "approve" ? "Approving…" : "Approve"}
              </Button>
              <Button variant="destructive" onClick={onReject} disabled={working}>
                {working && action === "reject" ? "Rejecting…" : "Reject"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
