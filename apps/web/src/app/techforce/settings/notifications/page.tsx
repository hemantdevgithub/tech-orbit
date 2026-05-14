"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import type { NotificationType } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { getNotificationClient } from "@/lib/api-client";

const TYPE_LABELS: Record<NotificationType, string> = {
  REQUIREMENT_PUBLISHED: "New requirements matching your skills",
  REQUIREMENT_ASSIGNED: "A CRM assigned you a requirement",
  SUBMISSION_RECEIVED: "New submissions for your requirements",
  SUBMISSION_INVITED: "An SRM invited you to apply",
  SUBMISSION_INVITE_ACCEPTED: "A candidate accepted your invitation",
  SUBMISSION_INVITE_DECLINED: "A candidate declined your invitation",
  PORTFOLIO_INVITATION: "An SRM invited you to their portfolio",
  PORTFOLIO_REQUEST: "Someone requested to join your portfolio",
  PORTFOLIO_APPROVED: "Portfolio membership approved",
  MSME_ASSIGNMENT: "An SRM assigned you a requirement",
  INTERVIEW_SCHEDULED: "Interview scheduled",
  TIMESHEET_SUBMITTED: "Timesheets awaiting your approval",
  TIMESHEET_APPROVED: "Your timesheet was approved",
  INVOICE_GENERATED: "New invoice ready",
  PAYOUT_COMPLETED: "Commission payout completed",
  MESSAGE_RECEIVED: "New messages",
  RATING_RECEIVED: "New ratings received",
};

const TYPES: NotificationType[] = [
  "REQUIREMENT_PUBLISHED",
  "REQUIREMENT_ASSIGNED",
  "SUBMISSION_RECEIVED",
  "SUBMISSION_INVITED",
  "SUBMISSION_INVITE_ACCEPTED",
  "SUBMISSION_INVITE_DECLINED",
  "PORTFOLIO_INVITATION",
  "PORTFOLIO_REQUEST",
  "PORTFOLIO_APPROVED",
  "MSME_ASSIGNMENT",
  "TIMESHEET_SUBMITTED",
  "TIMESHEET_APPROVED",
  "INVOICE_GENERATED",
  "PAYOUT_COMPLETED",
  "MESSAGE_RECEIVED",
  "RATING_RECEIVED",
];

export default function NotificationPreferencesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [perType, setPerType] = useState<Record<NotificationType, boolean>>(
    Object.fromEntries(TYPES.map((t) => [t, true])) as Record<NotificationType, boolean>,
  );

  useEffect(() => {
    getNotificationClient()
      .getPreferences()
      .then((prefs) => {
        setEmailEnabled(prefs.emailEnabled);
        setSmsEnabled(prefs.smsEnabled);
        setPerType((cur) => {
          const next = { ...cur };
          for (const t of TYPES) next[t] = prefs.perType[t] ?? true;
          return next;
        });
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load preferences"))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await getNotificationClient().updatePreferences({
        emailEnabled,
        smsEnabled,
        perType,
      });
      setNotice("Preferences saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sage-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-forest-900">Notification preferences</h1>
        <p className="text-sage-500 text-sm mt-0.5">
          Control how you receive updates. In-app notifications are always on.
        </p>
      </div>

      {notice && <div className="p-3 rounded-lg bg-mint-200 text-forest-900 text-sm">{notice}</div>}
      {error && <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>}

      <Card>
        <CardHeader><CardTitle>Delivery channels</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-forest-900">Email</p>
              <p className="text-xs text-sage-500">Get an email when something needs your attention.</p>
            </div>
            <input
              type="checkbox"
              checked={emailEnabled}
              onChange={(e) => setEmailEnabled(e.target.checked)}
              className="w-5 h-5 accent-forest-700"
            />
          </label>
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-forest-900">SMS</p>
              <p className="text-xs text-sage-500">Text message alerts (requires phone number on file).</p>
            </div>
            <input
              type="checkbox"
              checked={smsEnabled}
              onChange={(e) => setSmsEnabled(e.target.checked)}
              className="w-5 h-5 accent-forest-700"
            />
          </label>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>What to notify about</CardTitle></CardHeader>
        <CardBody className="space-y-2">
          {TYPES.map((t) => (
            <label key={t} className="flex items-center justify-between gap-4 py-1.5 cursor-pointer">
              <span className="text-sm text-forest-900">{TYPE_LABELS[t]}</span>
              <input
                type="checkbox"
                checked={perType[t]}
                onChange={(e) => setPerType((p) => ({ ...p, [t]: e.target.checked }))}
                className="w-5 h-5 accent-forest-700"
              />
            </label>
          ))}
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </div>
  );
}
