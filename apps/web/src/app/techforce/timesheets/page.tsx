"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import type { TimesheetResponse, TimesheetStatus } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { useAuthStore } from "@/store/auth.store";
import { getPaymentsClient } from "@/lib/api-client";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { useDisplayName } from "@/lib/display-names";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<TimesheetStatus, string> = {
  DRAFT: "bg-surface-soft text-sage-500 border-surface-border",
  SUBMITTED: "bg-info/10 text-info border-info/30",
  APPROVED: "bg-success/10 text-success border-success/30",
  REJECTED: "bg-danger/10 text-danger border-danger/20",
  INVOICED: "bg-forest-100 text-forest-700 border-forest-200",
};

export default function TimesheetsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [rows, setRows] = useState<TimesheetResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [filter, setFilter] = useState<TimesheetStatus | "ALL">("ALL");
  const [notice, setNotice] = useState<string | null>(null);

  const isCustomer = user?.roles?.some((r) => r.roleType === "CUSTOMER");
  const isCandidate = user?.roles?.some((r) => r.roleType === "CANDIDATE");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = filter === "ALL" ? { limit: 50 } : { limit: 50, status: filter };
      const res = await getPaymentsClient().listTimesheets(filters);
      setRows(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load timesheets");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (searchParams?.get("submitted")) setNotice("Timesheet submitted.");
  }, [searchParams]);

  async function approve(id: string) {
    setWorking(id);
    try {
      await getPaymentsClient().approveTimesheet(id);
      setNotice("Timesheet approved.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to approve");
    } finally {
      setWorking(null);
    }
  }

  async function reject(id: string) {
    const reason = window.prompt("Rejection reason?");
    if (!reason?.trim()) return;
    setWorking(id);
    try {
      await getPaymentsClient().rejectTimesheet(id, { reason: reason.trim() });
      setNotice("Timesheet rejected.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reject");
    } finally {
      setWorking(null);
    }
  }

  const filters: (TimesheetStatus | "ALL")[] = ["ALL", "SUBMITTED", "APPROVED", "REJECTED", "INVOICED"];

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/techforce/dashboard" },
          { label: "Timesheets" },
        ]}
      />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-forest-900">Timesheets</h1>
        <p className="text-sage-500 text-sm mt-0.5">
          {isCandidate && "Your submitted weekly hours."}
          {isCustomer && !isCandidate && "Timesheets on placements you own."}
        </p>
      </div>

      {notice && <div className="mb-4 p-3 rounded-lg bg-mint-200 text-forest-900 text-sm">{notice}</div>}
      {error && <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>}

      <div className="mb-4 flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === f
                ? "bg-forest-800 text-cream-100 border-forest-800"
                : "bg-surface text-sage-600 border-surface-border hover:border-forest-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sage-500">Loading…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardHeader><CardTitle>No timesheets</CardTitle></CardHeader>
          <CardBody>
            <p className="text-sage-500 text-sm">
              {isCandidate ? "Submit a timesheet from your placement page." : "No timesheets to review."}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((t) => (
            <TimesheetRow
              key={t.id}
              t={t}
              isOwnCandidate={t.candidateId === user?.id}
              isCustomer={!!isCustomer}
              working={working}
              onApprove={approve}
              onReject={reject}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TimesheetRow({
  t,
  isOwnCandidate,
  isCustomer,
  working,
  onApprove,
  onReject,
}: {
  t: TimesheetResponse;
  isOwnCandidate: boolean;
  isCustomer: boolean;
  working: string | null;
  onApprove: (id: string) => void | Promise<void>;
  onReject: (id: string) => void | Promise<void>;
}) {
  const candidateName = useDisplayName(isOwnCandidate ? null : t.candidateId, "candidate");
  return (
    <Card className="hover:border-forest-300 transition-colors">
      <CardBody className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-forest-900">
            Week of {new Date(t.weekStartDate).toUTCString().slice(5, 16)} · {t.hoursWorked} hrs
          </p>
          <p className="text-xs text-sage-500 mt-0.5">
            Placement #{t.placementId.slice(0, 8)}
            {!isOwnCandidate && <> · {candidateName}</>}
            {t.submittedAt && <> · Submitted {new Date(t.submittedAt).toLocaleDateString()}</>}
            {t.rejectionReason && <> · <span className="text-danger">Rejected: {t.rejectionReason}</span></>}
          </p>
          {t.description && (
            <p className="text-xs text-sage-600 mt-1 italic">{t.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[t.status]}`}>
            {t.status}
          </span>
          {isCustomer && t.status === "SUBMITTED" && (
            <>
              <Button size="sm" onClick={() => onApprove(t.id)} disabled={working === t.id}>
                Approve
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onReject(t.id)} disabled={working === t.id}>
                Reject
              </Button>
            </>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
