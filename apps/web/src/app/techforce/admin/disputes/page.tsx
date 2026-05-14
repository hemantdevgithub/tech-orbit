"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody } from "@techorbit/ui";
import type { DisputeListResponse, DisputeStatus, DisputeType } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { getAdminClient } from "@/lib/api-client";

const STATUSES: Array<DisputeStatus | "ALL"> = ["ALL", "OPEN", "UNDER_REVIEW", "RESOLVED", "CLOSED"];
const TYPES: Array<DisputeType | "ALL"> = ["ALL", "TIMESHEET", "COMMISSION", "PAYMENT", "CONDUCT", "OTHER"];

const STATUS_PILL: Record<DisputeStatus, string> = {
  OPEN: "bg-warning/10 text-warning border-warning/30",
  UNDER_REVIEW: "bg-info/10 text-info border-info/30",
  RESOLVED: "bg-success/10 text-success border-success/30",
  CLOSED: "bg-surface-soft text-sage-500 border-surface-border",
};

export default function DisputesListPage() {
  const [status, setStatus] = useState<DisputeStatus | "ALL">("OPEN");
  const [type, setType] = useState<DisputeType | "ALL">("ALL");
  const [rows, setRows] = useState<DisputeListResponse["data"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getAdminClient()
      .listDisputes({
        limit: 50,
        ...(status !== "ALL" ? { status } : {}),
        ...(type !== "ALL" ? { type } : {}),
      })
      .then((r) => setRows(r.data))
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [status, type]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-forest-900">Disputes</h1>
        <p className="text-sage-500 text-sm mt-0.5">{rows.length} in current view</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs font-medium text-sage-600">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as DisputeStatus | "ALL")}
          className="px-3 py-1.5 rounded-lg border border-surface-border bg-surface text-sm"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <label className="text-xs font-medium text-sage-600">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as DisputeType | "ALL")}
          className="px-3 py-1.5 rounded-lg border border-surface-border bg-surface text-sm"
        >
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {error && <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>}

      {loading ? (
        <p className="text-sage-500">Loading…</p>
      ) : rows.length === 0 ? (
        <Card><CardBody><p className="text-sage-500 text-sm">No disputes match.</p></CardBody></Card>
      ) : (
        <Card>
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead className="text-left text-xs text-sage-500 uppercase tracking-wider border-b border-surface-border">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Raised by</th>
                  <th className="px-4 py-3">Context</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="border-b border-surface-border/50 last:border-0 hover:bg-cream-50">
                    <td className="px-4 py-3 font-semibold text-forest-900">{d.type}</td>
                    <td className="px-4 py-3 font-mono text-xs text-sage-700">{d.raisedBy.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-sage-700 text-xs">
                      {d.contextType} · <span className="font-mono">{d.contextId.slice(0, 8)}…</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${STATUS_PILL[d.status]}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sage-600">{new Date(d.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/techforce/admin/disputes/${d.id}`} className="text-forest-700 hover:underline text-xs font-semibold">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
