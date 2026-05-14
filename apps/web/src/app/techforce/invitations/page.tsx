"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, CardBody } from "@techorbit/ui";
import type { SubmissionResponse } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { useAuthStore } from "@/store/auth.store";
import { getMatchingClient } from "@/lib/api-client";
import { Breadcrumbs } from "@/components/breadcrumbs";

// Sprint 12 — Candidate invitations inbox. Shows submissions in status
// INVITED that the candidate must accept or decline before they enter the
// regular screening pipeline.
export default function InvitationsPage(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const [rows, setRows] = useState<SubmissionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getMatchingClient().listSubmissions({
        candidateId: user.id,
        status: "INVITED",
        limit: 50,
      });
      setRows(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function accept(id: string) {
    setWorking(id);
    setError(null);
    try {
      await getMatchingClient().acceptInvite(id);
      setNotice("Invitation accepted — your submission is now in screening.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to accept");
    } finally {
      setWorking(null);
    }
  }

  async function decline(id: string) {
    const reason = window.prompt("Reason for declining (optional)?") ?? "Declined by candidate";
    if (!reason.trim()) return;
    setWorking(id);
    setError(null);
    try {
      await getMatchingClient().declineInvite(id, { reason: reason.trim() });
      setNotice("Invitation declined.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to decline");
    } finally {
      setWorking(null);
    }
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/techforce/dashboard" },
          { label: "Invitations" },
        ]}
      />
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-forest-900">Invitations</h1>
        <p className="text-sage-500 text-sm mt-0.5">
          Requirements an SRM has invited you to apply for. Accept to enter the
          screening pipeline; decline if not a fit.
        </p>
      </div>

      {notice && (
        <div className="mb-4 p-3 rounded-lg bg-mint-200 text-forest-900 text-sm">{notice}</div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sage-500">Loading…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sage-500 text-sm">
              No pending invitations. When an SRM in your portfolio invites you
              to a requirement, it'll show up here.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((s) => (
            <Card key={s.id} className="hover:border-forest-300 transition-colors motion-reduce:transition-none">
              <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/techforce/requirements/${s.requirementId}`}
                    className="font-semibold text-forest-900 text-sm hover:text-forest-700"
                  >
                    Requirement {s.requirementId.slice(0, 8)}…
                  </Link>
                  <p className="text-xs text-sage-500 mt-0.5">
                    Invited{" "}
                    {s.invitedAt
                      ? new Date(s.invitedAt).toLocaleDateString()
                      : new Date(s.createdAt).toLocaleDateString()}
                    {s.invitedBySrmId && (
                      <> · From SRM {s.invitedBySrmId.slice(0, 8)}…</>
                    )}
                  </p>
                  {s.coverNote && (
                    <p className="text-xs text-sage-600 mt-2 italic">
                      "{s.coverNote}"
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => accept(s.id)}
                    disabled={working === s.id}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => decline(s.id)}
                    disabled={working === s.id}
                  >
                    Decline
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
