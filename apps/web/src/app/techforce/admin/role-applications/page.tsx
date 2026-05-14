"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody } from "@techorbit/ui";
import type { ApplicationRole, ApplicationStatus, RoleApplicationResponse } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { getAdminClient } from "@/lib/api-client";

const STATUSES: Array<ApplicationStatus | "ALL"> = ["ALL", "PENDING", "APPROVED", "REJECTED"];
const ROLES: Array<ApplicationRole | "ALL"> = ["ALL", "CRM", "SRM", "MSME"];

const STATUS_PILL: Record<ApplicationStatus, string> = {
  PENDING: "bg-warning/10 text-warning border-warning/30",
  APPROVED: "bg-success/10 text-success border-success/30",
  REJECTED: "bg-danger/10 text-danger border-danger/20",
};

export default function RoleApplicationsListPage() {
  const [status, setStatus] = useState<ApplicationStatus | "ALL">("PENDING");
  const [role, setRole] = useState<ApplicationRole | "ALL">("ALL");
  const [rows, setRows] = useState<RoleApplicationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getAdminClient()
      .listApplications({
        limit: 50,
        ...(status !== "ALL" ? { status } : {}),
        ...(role !== "ALL" ? { requestedRole: role } : {}),
      })
      .then((r) => setRows(r.data))
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [status, role]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-forest-900">Role applications</h1>
        <p className="text-sage-500 text-sm mt-0.5">{rows.length} in current view</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs font-medium text-sage-600">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ApplicationStatus | "ALL")}
          className="px-3 py-1.5 rounded-lg border border-surface-border bg-surface text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <label className="text-xs font-medium text-sage-600">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as ApplicationRole | "ALL")}
          className="px-3 py-1.5 rounded-lg border border-surface-border bg-surface text-sm"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {error && <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>}
      {loading ? (
        <p className="text-sage-500">Loading…</p>
      ) : rows.length === 0 ? (
        <Card><CardBody><p className="text-sage-500 text-sm">No applications match.</p></CardBody></Card>
      ) : (
        <Card>
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="text-left text-xs text-sage-500 uppercase tracking-wider border-b border-surface-border">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Applied</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-surface-border/50 last:border-0 hover:bg-cream-50">
                    <td className="px-4 py-3 font-mono text-xs text-sage-700">{r.userId}</td>
                    <td className="px-4 py-3 font-semibold text-forest-900">{r.requestedRole}</td>
                    <td className="px-4 py-3 text-sage-600">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${STATUS_PILL[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/techforce/admin/role-applications/${r.id}`} className="text-forest-700 hover:underline text-xs font-semibold">
                        Review →
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
