"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, CardBody } from "@techorbit/ui";
import type {
  PortfolioMemberType,
  SrmPortfolioMembershipResponse,
} from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { getProfileClient } from "@/lib/api-client";
import { Breadcrumbs } from "@/components/breadcrumbs";

// Sprint 12 — SRM Roster page. Lists APPROVED candidates + MSMEs the SRM
// works with. Adding a member is two-sided: the SRM sends an invitation
// here, and the candidate/MSME must approve it from /techforce/roster/requests.
export default function RosterPage(): JSX.Element {
  const [tab, setTab] = useState<PortfolioMemberType>("CANDIDATE");
  const [rows, setRows] = useState<SrmPortfolioMembershipResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [inviteId, setInviteId] = useState("");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProfileClient().listSrmRoster({
        status: "APPROVED",
        memberType: tab,
      });
      setRows(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function invite() {
    const id = inviteId.trim();
    if (!id) return;
    setInviting(true);
    setError(null);
    try {
      await getProfileClient().invitePortfolioMember({
        memberUserId: id,
        memberType: tab,
      });
      setNotice(
        `Invitation sent — it'll show up in your roster once they approve.`,
      );
      setInviteId("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to invite");
    } finally {
      setInviting(false);
    }
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/techforce/dashboard" },
          { label: "Roster" },
        ]}
      />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-forest-900">Roster</h1>
          <p className="text-sage-500 text-sm mt-0.5">
            Your approved candidates and vendor partners.
          </p>
        </div>
        <Link
          href="/techforce/roster/requests"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-surface-border bg-surface text-sm font-medium text-forest-800 hover:border-forest-300 transition-colors motion-reduce:transition-none"
        >
          Pending requests →
        </Link>
      </div>

      {notice && (
        <div className="mb-4 p-3 rounded-lg bg-mint-200 text-forest-900 text-sm">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">
          {error}
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setTab("CANDIDATE")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            tab === "CANDIDATE"
              ? "bg-forest-800 text-cream-100 border-forest-800"
              : "bg-surface text-sage-600 border-surface-border hover:border-forest-300"
          }`}
        >
          Candidates
        </button>
        <button
          onClick={() => setTab("MSME")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            tab === "MSME"
              ? "bg-forest-800 text-cream-100 border-forest-800"
              : "bg-surface text-sage-600 border-surface-border hover:border-forest-300"
          }`}
        >
          MSMEs
        </button>
      </div>

      <Card className="mb-6">
        <CardBody>
          <p className="text-xs text-sage-500 mb-2 uppercase tracking-wider font-semibold">
            Add {tab === "CANDIDATE" ? "a candidate" : "an MSME"}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={inviteId}
              onChange={(e) => setInviteId(e.target.value)}
              placeholder={`${tab === "CANDIDATE" ? "Candidate" : "MSME primary"} user ID (UUID)`}
              className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-surface-border bg-surface focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm font-mono"
            />
            <Button onClick={invite} disabled={inviting || !inviteId.trim()}>
              {inviting ? "Sending…" : "Send invitation"}
            </Button>
          </div>
          <p className="text-xs text-sage-500 mt-2">
            They'll receive a notification and must approve before they appear
            in your roster.
          </p>
        </CardBody>
      </Card>

      {loading ? (
        <p className="text-sage-500">Loading…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sage-500 text-sm">
              No approved {tab === "CANDIDATE" ? "candidates" : "MSMEs"} yet.
              Send an invitation above or accept incoming requests.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((m) => (
            <Card key={m.id}>
              <CardBody className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-semibold text-forest-900 text-sm font-mono">
                    {m.memberUserId.slice(0, 8)}…
                  </p>
                  <p className="text-xs text-sage-500 mt-0.5">
                    {m.memberType} · Added{" "}
                    {m.approvedAt
                      ? new Date(m.approvedAt).toLocaleDateString()
                      : "—"}
                    {m.initiatedBy === "MEMBER" && " · They asked to join"}
                    {m.initiatedBy === "SRM" && " · You invited them"}
                  </p>
                </div>
                <Badge variant="success">Active</Badge>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
