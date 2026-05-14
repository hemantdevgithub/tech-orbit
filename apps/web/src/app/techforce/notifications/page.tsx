"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import type { NotificationResponse, NotificationType } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { getNotificationClient } from "@/lib/api-client";
import {
  BriefcaseIcon,
  CalendarIcon,
  ClockIcon,
  DollarIcon,
  MessageIcon,
  ReceiptIcon,
  TargetIcon,
  UserIcon,
} from "@/components/icons";

type IconComp = (p: { size?: number; className?: string }) => JSX.Element;
const TYPE_ICON: Record<NotificationType, IconComp> = {
  REQUIREMENT_PUBLISHED: BriefcaseIcon,
  SUBMISSION_RECEIVED: UserIcon,
  INTERVIEW_SCHEDULED: CalendarIcon,
  TIMESHEET_SUBMITTED: ClockIcon,
  TIMESHEET_APPROVED: ClockIcon,
  INVOICE_GENERATED: ReceiptIcon,
  PAYOUT_COMPLETED: DollarIcon,
  MESSAGE_RECEIVED: MessageIcon,
  RATING_RECEIVED: TargetIcon,
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsPage() {
  const [rows, setRows] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getNotificationClient().list({
        unreadOnly: filter === "UNREAD",
        limit: 50,
      });
      setRows(res.data);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  async function markAllRead() {
    setWorking(true);
    try {
      await getNotificationClient().markAllRead();
      await load();
    } finally {
      setWorking(false);
    }
  }

  async function handleClick(n: NotificationResponse) {
    if (!n.readAt) {
      try {
        await getNotificationClient().markRead(n.id);
        setUnreadCount((c) => Math.max(0, c - 1));
        setRows((r) => r.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      } catch {
        // no-op; link navigation still happens
      }
    }
  }

  if (loading) return <p className="text-sage-500">Loading…</p>;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-forest-900">Notifications</h1>
          <p className="text-sage-500 text-sm mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/techforce/settings/notifications"
            className="text-xs text-forest-700 hover:underline"
          >
            Preferences →
          </Link>
          {unreadCount > 0 && (
            <Button size="sm" variant="secondary" onClick={markAllRead} disabled={working}>
              {working ? "Marking…" : "Mark all as read"}
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto -mx-1 px-1 pb-1">
        {(["ALL", "UNREAD"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors shrink-0 ${
              filter === f
                ? "bg-forest-800 text-cream-100 border-forest-800"
                : "bg-surface text-sage-600 border-surface-border hover:border-forest-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>
      )}

      {rows.length === 0 ? (
        <Card>
          <CardHeader><CardTitle>No notifications yet</CardTitle></CardHeader>
          <CardBody>
            <p className="text-sage-500 text-sm">
              You&apos;ll see updates here when something needs your attention.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((n) => {
            const unread = !n.readAt;
            const content = (
              <Card
                className={`hover:border-forest-300 transition-colors motion-reduce:transition-none ${
                  unread ? "border-l-4 border-l-forest-700" : ""
                }`}
              >
                <CardBody className="flex items-start gap-3">
                  <span className="shrink-0 w-9 h-9 rounded-lg bg-forest-100 text-forest-700 flex items-center justify-center">
                    {(() => {
                      const Icon = TYPE_ICON[n.type];
                      return <Icon size={18} />;
                    })()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 sm:gap-3">
                      <p
                        className={`text-sm truncate ${
                          unread ? "font-semibold text-forest-900" : "text-sage-700"
                        }`}
                      >
                        {n.title}
                      </p>
                      <span className="text-xs text-sage-500 shrink-0">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-sage-600 mt-0.5 line-clamp-3">{n.message}</p>
                  </div>
                  {unread && <span className="w-2 h-2 rounded-full bg-forest-700 shrink-0 mt-2" aria-label="Unread" />}
                </CardBody>
              </Card>
            );
            return n.linkUrl ? (
              <Link key={n.id} href={n.linkUrl} onClick={() => handleClick(n)} className="block">
                {content}
              </Link>
            ) : (
              <button key={n.id} onClick={() => handleClick(n)} className="block w-full text-left">
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
