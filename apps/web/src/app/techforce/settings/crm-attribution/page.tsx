"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from "@techorbit/ui";
import type { CrmAttributionRequestResponse } from "@techorbit/types";
import { getRequirementClient } from "@/lib/api-client";
import { ApiError } from "@techorbit/api-client";

export default function CrmAttributionSettingsPage() {
  const [rows, setRows] = useState<CrmAttributionRequestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRequirementClient().listPendingAttributions();
      setRows(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onApprove(id: string): Promise<void> {
    setBusyId(id);
    setError(null);
    try {
      await getRequirementClient().approveAttribution(id);
      // Optimistically drop the row — the API returns the APPROVED record,
      // but our queue view is pending-only so it no longer belongs here.
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to approve");
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(id: string): Promise<void> {
    setBusyId(id);
    setError(null);
    try {
      await getRequirementClient().rejectAttribution(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reject");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-forest-900 mb-2">CRM attribution</h1>
      <p className="text-sage-600 mb-6">
        CRMs can claim attribution on your published requirements. Approve the
        ones you want; reject the rest.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-800 text-sm">{error}</div>
      )}

      {loading ? (
        <p className="text-sage-600">Loading…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardBody className="text-sage-600 text-center py-10">
            No pending CRM attribution requests.
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pending requests ({rows.length})</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-mint-100 text-forest-900">
                <tr>
                  <th className="text-left px-4 py-2">CRM user</th>
                  <th className="text-left px-4 py-2">Requirement</th>
                  <th className="text-left px-4 py-2">Requested</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-right px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-sage-200">
                    <td className="px-4 py-3 font-mono text-xs">{r.crmUserId}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/techforce/requirements/${r.requirementId}`}
                        className="text-forest-700 hover:underline font-medium"
                      >
                        View requirement →
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sage-600">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="warning">{r.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onReject(r.id)}
                        disabled={busyId === r.id}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onApprove(r.id)}
                        disabled={busyId === r.id}
                      >
                        Approve
                      </Button>
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
