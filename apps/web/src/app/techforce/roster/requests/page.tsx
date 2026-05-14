"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, CardBody } from "@techorbit/ui";
import type { SrmPortfolioMembershipResponse } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { useAuthStore } from "@/store/auth.store";
import { getProfileClient } from "@/lib/api-client";
import { Breadcrumbs } from "@/components/breadcrumbs";

// Sprint 12 — Portfolio requests inbox. Works for BOTH sides of the
// two-sided handshake:
//   - SRM: sees PENDING requests where someone is asking to join their roster,
//     plus invitations they themselves sent that are still pending.
//   - Candidate / MSME: sees PENDING invitations from SRMs.
// Approval/rejection is gated server-side to the non-initiator.
export default function RosterRequestsPage(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const roles = (user?.roles ?? [])
    .filter((r) => r.status === "ACTIVE")
    .map((r) => r.roleType);
  const isSrm = roles.includes("SRM");
  const isAdmin = roles.includes("ADMIN");

  const [srmInbox, setSrmInbox] = useState<SrmPortfolioMembershipResponse[]>([]);
  const [memberInbox, setMemberInbox] = useState<SrmPortfolioMembershipResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const client = getProfileClient();
    try {
      const [s, m] = await Promise.all([
        isSrm || isAdmin
          ? client.listSrmRoster({ status: "PENDING" })
          : Promise.resolve({ data: [] }),
        client.listMyPortfolio({ status: "PENDING" }),
      ]);
      setSrmInbox(s.data);
      setMemberInbox(m.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [user, isSrm, isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(id: string) {
    setWorking(id);
    setError(null);
    try {
      await getProfileClient().approvePortfolioRequest(id);
      setNotice("Approved.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to approve");
    } finally {
      setWorking(null);
    }
  }

  async function reject(id: string) {
    const reason = window.prompt("Reason for rejection (optional)?");
    setWorking(id);
    setError(null);
    try {
      await getProfileClient().rejectPortfolioRequest(id, { reason: reason?.trim() ?? undefined });
      setNotice("Rejected.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reject");
    } finally {
      setWorking(null);
    }
  }

  // Items the CURRENT user can approve (they're the non-initiator).
  const actionableSrmInbox = useMemo(
    () => srmInbox.filter((m) => m.initiatedBy === "MEMBER"),
    [srmInbox],
  );
  const actionableMemberInbox = useMemo(
    () => memberInbox.filter((m) => m.initiatedBy === "SRM"),
    [memberInbox],
  );
  const myOutbox = useMemo(
    () => [
      ...srmInbox.filter((m) => m.initiatedBy === "SRM"),
      ...memberInbox.filter((m) => m.initiatedBy === "MEMBER"),
    ],
    [srmInbox, memberInbox],
  );

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/techforce/dashboard" },
          { label: "Roster", href: "/techforce/roster" },
          { label: "Requests" },
        ]}
      />
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-forest-900">
          Portfolio requests
        </h1>
        <p className="text-sage-500 text-sm mt-0.5">
          Pending invitations and join requests.
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
      ) : (
        <div className="space-y-6">
          {/* Actionable for you: requests where you're the non-initiator */}
          {(actionableSrmInbox.length > 0 || actionableMemberInbox.length > 0) && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest text-sage-500 mb-3">
                Awaiting your response
              </p>
              <div className="space-y-2">
                {actionableSrmInbox.map((m) => (
                  <RequestRow
                    key={m.id}
                    membership={m}
                    actionLabel={`Approve ${m.memberType.toLowerCase()} → roster`}
                    onApprove={approve}
                    onReject={reject}
                    working={working}
                  />
                ))}
                {actionableMemberInbox.map((m) => (
                  <RequestRow
                    key={m.id}
                    membership={m}
                    actionLabel={`Accept SRM invitation`}
                    onApprove={approve}
                    onReject={reject}
                    working={working}
                  />
                ))}
              </div>
            </section>
          )}

          {/* My outbox — requests I sent that are still pending */}
          {myOutbox.length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest text-sage-500 mb-3">
                Sent by you (awaiting response)
              </p>
              <div className="space-y-2">
                {myOutbox.map((m) => (
                  <Card key={m.id}>
                    <CardBody className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-forest-900 font-mono">
                          {m.memberUserId.slice(0, 8)}…
                          {m.initiatedBy === "MEMBER" && (
                            <> → SRM {m.srmUserId.slice(0, 8)}…</>
                          )}
                        </p>
                        <p className="text-xs text-sage-500 mt-0.5">
                          {m.memberType} · Sent {new Date(m.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="warning">Pending</Badge>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {actionableSrmInbox.length === 0 &&
            actionableMemberInbox.length === 0 &&
            myOutbox.length === 0 && (
              <Card>
                <CardBody>
                  <p className="text-sage-500 text-sm">
                    No pending portfolio requests. Invite a candidate or MSME
                    from your{" "}
                    <Link href="/techforce/roster" className="text-forest-700 hover:underline">
                      Roster
                    </Link>{" "}
                    page.
                  </p>
                </CardBody>
              </Card>
            )}
        </div>
      )}
    </div>
  );
}

function RequestRow({
  membership,
  actionLabel,
  onApprove,
  onReject,
  working,
}: {
  membership: SrmPortfolioMembershipResponse;
  actionLabel: string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  working: string | null;
}) {
  return (
    <Card className="hover:border-forest-300 transition-colors motion-reduce:transition-none">
      <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-forest-900 font-mono truncate">
            {membership.initiatedBy === "MEMBER"
              ? `${membership.memberUserId.slice(0, 8)}…`
              : `SRM ${membership.srmUserId.slice(0, 8)}…`}
          </p>
          <p className="text-xs text-sage-500 mt-0.5">
            {membership.memberType} ·{" "}
            {new Date(membership.createdAt).toLocaleDateString()} · {actionLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            size="sm"
            onClick={() => onApprove(membership.id)}
            disabled={working === membership.id}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onReject(membership.id)}
            disabled={working === membership.id}
          >
            Reject
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
