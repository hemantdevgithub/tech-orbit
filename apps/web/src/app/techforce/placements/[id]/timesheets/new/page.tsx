"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardBody, CardHeader, CardTitle, Input, Label } from "@techorbit/ui";
import type { PlacementResponse } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { useAuthStore } from "@/store/auth.store";
import { getPaymentsClient, getPlacementClient } from "@/lib/api-client";

// Build a list of the last 8 "week of <Monday>" options.  Each is a
// Monday 00:00 UTC timestamp.
function lastNWeeks(n: number): { label: string; isoMonday: string }[] {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = today.getUTCDay();
  const thisMonday = new Date(today);
  thisMonday.setUTCDate(today.getUTCDate() + (day === 0 ? -6 : 1 - day));
  const weeks: { label: string; isoMonday: string }[] = [];
  // Start from LAST week (thisMonday - 7) and go back
  for (let i = 1; i <= n; i++) {
    const monday = new Date(thisMonday);
    monday.setUTCDate(thisMonday.getUTCDate() - 7 * i);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    weeks.push({
      label: `Week of ${monday.toUTCString().slice(5, 16)} → ${sunday.toUTCString().slice(5, 16)}`,
      isoMonday: monday.toISOString(),
    });
  }
  return weeks;
}

export default function NewTimesheetPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [placement, setPlacement] = useState<PlacementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const weeks = useMemo(() => lastNWeeks(8), []);
  const [weekIso, setWeekIso] = useState<string>(weeks[0]?.isoMonday ?? "");
  const [hoursWorked, setHoursWorked] = useState("40");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    getPlacementClient()
      .getById(params.id)
      .then(setPlacement)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Failed to load placement"),
      )
      .finally(() => setLoading(false));
  }, [params?.id]);

  const isCandidate = user?.roles?.some((r) => r.roleType === "CANDIDATE");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!placement) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const ts = await getPaymentsClient().submitTimesheet({
        placementId: placement.id,
        weekStartDate: weekIso,
        hoursWorked: Number(hoursWorked),
        description: description.trim() || undefined,
      });
      router.push(`/techforce/timesheets?submitted=${ts.id}`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Failed to submit timesheet");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sage-500">Loading…</p>;
  if (loadError || !placement) {
    return <Card><CardBody className="text-danger">{loadError ?? "Not found"}</CardBody></Card>;
  }
  if (!isCandidate) {
    return <Card><CardBody><p className="text-sage-700">Only the candidate on this placement can submit timesheets.</p></CardBody></Card>;
  }

  const hoursNum = Number(hoursWorked) || 0;
  const estimatedPay = placement.payRateUsd ? hoursNum * placement.payRateUsd : null;

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link href={`/techforce/placements/${placement.id}`} className="text-sm text-forest-700 hover:underline">
          ← Back to placement
        </Link>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-forest-900 mb-1">Submit timesheet</h1>
      <p className="text-sage-500 text-sm mb-6">
        Placement: {placement.engagementType} · ${placement.billRateUsd.toFixed(2)}/hr
      </p>

      <Card>
        <CardHeader><CardTitle>Weekly hours</CardTitle></CardHeader>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <Label htmlFor="week">Week</Label>
              <select
                id="week"
                value={weekIso}
                onChange={(e) => setWeekIso(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-surface text-forest-900 focus:outline-none focus:ring-2 focus:ring-forest-500/20"
              >
                {weeks.map((w) => (
                  <option key={w.isoMonday} value={w.isoMonday}>{w.label}</option>
                ))}
              </select>
              <p className="text-xs text-sage-500 mt-1">Must be a past week (current week is invoiced next Monday).</p>
            </div>

            <div>
              <Label htmlFor="hours">Hours worked</Label>
              <Input
                id="hours"
                type="number"
                step="0.25"
                min="0"
                max="168"
                value={hoursWorked}
                onChange={(e) => setHoursWorked(e.target.value)}
                required
                disabled={submitting}
              />
              <p className="text-xs text-sage-500 mt-1">Range: 0–168. Quarter-hour increments supported.</p>
            </div>

            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={2000}
                disabled={submitting}
                className="w-full rounded-md border border-surface-border p-2 text-sm"
                placeholder="What did you work on this week?"
              />
            </div>

            {estimatedPay !== null && (
              <div className="p-3 rounded-lg bg-mint-100 border border-mint-300 text-sm">
                <p className="text-forest-900 font-medium">
                  Estimated gross pay: ${estimatedPay.toFixed(2)}
                </p>
                <p className="text-xs text-sage-600 mt-0.5">
                  {hoursNum} hrs × ${placement.payRateUsd?.toFixed(2)}/hr. Paid after the week's invoice clears (net-30 to customer).
                </p>
              </div>
            )}

            {submitError && (
              <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">
                {submitError}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit timesheet"}
              </Button>
              <Link href={`/techforce/placements/${placement.id}`}>
                <Button type="button" variant="secondary" disabled={submitting}>Cancel</Button>
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
