"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, CardBody } from "@techorbit/ui";
import type { SuspendDuration, UserSearchResult } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { getAdminClient } from "@/lib/api-client";

const STATUS_PILL: Record<string, string> = {
  ACTIVE: "bg-success/10 text-success border-success/30",
  PENDING: "bg-warning/10 text-warning border-warning/30",
  SUSPENDED: "bg-danger/10 text-danger border-danger/20",
  BANNED: "bg-danger/20 text-danger border-danger/40",
};

export default function UserManagementPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [suspendTarget, setSuspendTarget] = useState<UserSearchResult | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendDuration, setSuspendDuration] = useState<SuspendDuration>("THIRTY_DAYS");
  const [banTarget, setBanTarget] = useState<UserSearchResult | null>(null);
  const [banReason, setBanReason] = useState("");
  const [working, setWorking] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminClient().searchUsers(query.trim());
      setResults(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function confirmSuspend() {
    if (!suspendTarget) return;
    if (!suspendReason.trim()) {
      setError("Reason required");
      return;
    }
    setWorking(true);
    try {
      await getAdminClient().suspendUser(suspendTarget.id, {
        reason: suspendReason.trim(),
        duration: suspendDuration,
      });
      setNotice(`Suspended ${suspendTarget.email}.`);
      setSuspendTarget(null);
      setSuspendReason("");
      setResults((r) => r.map((u) => (u.id === suspendTarget.id ? { ...u, status: "SUSPENDED" } : u)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Suspend failed");
    } finally {
      setWorking(false);
    }
  }

  async function confirmBan() {
    if (!banTarget) return;
    if (!banReason.trim()) {
      setError("Reason required");
      return;
    }
    setWorking(true);
    try {
      await getAdminClient().banUser(banTarget.id, { reason: banReason.trim() });
      setNotice(`Banned ${banTarget.email}.`);
      setBanTarget(null);
      setBanReason("");
      setResults((r) => r.map((u) => (u.id === banTarget.id ? { ...u, status: "BANNED" } : u)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ban failed");
    } finally {
      setWorking(false);
    }
  }

  async function triggerReset(u: UserSearchResult) {
    setWorking(true);
    try {
      await getAdminClient().triggerPasswordReset(u.id);
      setNotice(`Password reset email sent to ${u.email}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reset failed");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-forest-900">Users</h1>
        <p className="text-sage-500 text-sm mt-0.5">Search, suspend, ban, reset passwords</p>
      </div>

      {notice && <div className="p-3 rounded-lg bg-mint-200 text-forest-900 text-sm">{notice}</div>}
      {error && <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>}

      <form onSubmit={search} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email or name"
          className="flex-1 px-3 py-2 rounded-lg border border-surface-border bg-surface focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm"
        />
        <Button type="submit" disabled={loading || !query.trim()}>
          {loading ? "Searching…" : "Search"}
        </Button>
      </form>

      {results.length === 0 && !loading ? (
        <Card><CardBody><p className="text-sage-500 text-sm">Enter a query to search.</p></CardBody></Card>
      ) : (
        <Card>
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-sage-500 uppercase tracking-wider border-b border-surface-border">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Roles</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((u) => (
                  <tr key={u.id} className="border-b border-surface-border/50 last:border-0">
                    <td className="px-4 py-3 text-forest-900 font-medium">{u.email}</td>
                    <td className="px-4 py-3 text-sage-700">
                      {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 ? (
                          <span className="text-xs text-sage-400">none</span>
                        ) : (
                          u.roles.map((r) => (
                            <span key={r} className="px-2 py-0.5 bg-forest-100 text-forest-700 text-[10px] rounded-full font-medium">
                              {r}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${STATUS_PILL[u.status] ?? STATUS_PILL.ACTIVE}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sage-600 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <Button size="sm" variant="secondary" onClick={() => setSuspendTarget(u)} disabled={working}>
                          Suspend
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setBanTarget(u)} disabled={working}>
                          Ban
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => triggerReset(u)} disabled={working}>
                          Reset PW
                        </Button>
                        <Link
                          href={`/techforce/admin/audit-logs?targetId=${u.id}`}
                          className="px-2 py-1 text-[11px] font-semibold text-forest-700 hover:underline"
                        >
                          Audit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {/* Suspend modal */}
      {suspendTarget && (
        <Modal onClose={() => !working && setSuspendTarget(null)} title={`Suspend ${suspendTarget.email}`}>
          <div className="space-y-3 text-sm">
            <p className="text-sage-600">User will lose access immediately; existing sessions are revoked.</p>
            <div>
              <label className="block text-xs font-medium text-sage-600 mb-1">Reason</label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-surface-border bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-sage-600 mb-1">Duration</label>
              <select
                value={suspendDuration}
                onChange={(e) => setSuspendDuration(e.target.value as SuspendDuration)}
                className="w-full px-3 py-2 rounded-lg border border-surface-border bg-surface text-sm"
              >
                <option value="SEVEN_DAYS">7 days</option>
                <option value="THIRTY_DAYS">30 days</option>
                <option value="NINETY_DAYS">90 days</option>
                <option value="INDEFINITE">Indefinite</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setSuspendTarget(null)} disabled={working}>Cancel</Button>
              <Button onClick={confirmSuspend} disabled={working || !suspendReason.trim()}>
                {working ? "Suspending…" : "Confirm suspend"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Ban confirm */}
      {banTarget && (
        <Modal onClose={() => !working && setBanTarget(null)} title={`Ban ${banTarget.email}`}>
          <div className="space-y-3 text-sm">
            <p className="text-danger font-medium">
              Banning is permanent. The user loses all access and cannot re-register with this email.
            </p>
            <div>
              <label className="block text-xs font-medium text-sage-600 mb-1">Reason</label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-surface-border bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-forest-500 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setBanTarget(null)} disabled={working}>Cancel</Button>
              <Button variant="destructive" onClick={confirmBan} disabled={working || !banReason.trim()}>
                {working ? "Banning…" : "Confirm ban"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-forest-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl shadow-cardHover border border-surface-border max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-forest-900 mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}
