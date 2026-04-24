"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, CardBody } from "@techorbit/ui";
import type { AuditLogResponse } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { getAdminClient } from "@/lib/api-client";

const COMMON_ACTIONS = [
  "ALL",
  "ROLE_APPLICATION_APPROVED",
  "ROLE_APPLICATION_REJECTED",
  "USER_SUSPENDED",
  "USER_BANNED",
  "PASSWORD_RESET_TRIGGERED",
  "DISPUTE_RESOLVED",
] as const;

export default function AuditLogsPage() {
  const sp = useSearchParams();
  const initialTarget = sp?.get("targetId") ?? "";

  const [action, setAction] = useState<string>("ALL");
  const [targetId, setTargetId] = useState<string>(initialTarget);
  const [performedBy, setPerformedBy] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [rows, setRows] = useState<AuditLogResponse[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminClient().listAuditLogs({
        ...(action !== "ALL" ? { action } : {}),
        ...(targetId ? { targetId } : {}),
        ...(performedBy ? { performedBy } : {}),
        ...(from ? { from: new Date(from).toISOString() } : {}),
        ...(to ? { to: new Date(to).toISOString() } : {}),
        limit: 50,
      });
      setRows(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [action, targetId, performedBy, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-forest-900">Audit logs</h1>
        <p className="text-sage-500 text-sm mt-0.5">Append-only record of admin actions</p>
      </div>

      <Card>
        <CardBody className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
          <div>
            <label className="block text-xs font-medium text-sage-600 mb-1">Action</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-surface-border bg-surface text-sm"
            >
              {COMMON_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-sage-600 mb-1">Performed by (userId)</label>
            <input
              value={performedBy}
              onChange={(e) => setPerformedBy(e.target.value)}
              placeholder="UUID"
              className="w-full px-3 py-2 rounded-lg border border-surface-border bg-surface font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-sage-600 mb-1">Target ID</label>
            <input
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="userId, disputeId, etc."
              className="w-full px-3 py-2 rounded-lg border border-surface-border bg-surface font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-sage-600 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-surface-border bg-surface text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-sage-600 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-surface-border bg-surface text-sm"
            />
          </div>
        </CardBody>
      </Card>

      {error && <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>}

      {loading ? (
        <p className="text-sage-500">Loading…</p>
      ) : rows.length === 0 ? (
        <Card><CardBody><p className="text-sage-500 text-sm">No audit entries match.</p></CardBody></Card>
      ) : (
        <Card>
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-sage-500 uppercase tracking-wider border-b border-surface-border">
                <tr>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Performed by</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((log) => (
                  <>
                    <tr key={log.id} className="border-b border-surface-border/50 last:border-0">
                      <td className="px-4 py-3 font-semibold text-forest-900">{log.action}</td>
                      <td className="px-4 py-3 font-mono text-xs text-sage-700">{log.performedBy.slice(0, 8)}…</td>
                      <td className="px-4 py-3 text-sage-700 text-xs">
                        {log.targetType ? <><span className="font-semibold">{log.targetType}</span> · </> : null}
                        {log.targetId ? <code className="font-mono">{log.targetId.slice(0, 8)}…</code> : "—"}
                      </td>
                      <td className="px-4 py-3 text-sage-600 text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <Button size="sm" variant="ghost" onClick={() => toggle(log.id)}>
                            {expanded.has(log.id) ? "Hide" : "Details"}
                          </Button>
                        )}
                      </td>
                    </tr>
                    {expanded.has(log.id) && log.metadata && (
                      <tr key={`${log.id}-meta`} className="border-b border-surface-border/50">
                        <td colSpan={5} className="px-4 py-3 bg-cream-50">
                          <pre className="text-xs font-mono text-sage-700 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
