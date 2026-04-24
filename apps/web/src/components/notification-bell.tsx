"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { NotificationResponse, NotificationType } from "@techorbit/types";
import { getNotificationClient } from "@/lib/api-client";

const POLL_MS = 30_000;

const TYPE_ICONS: Record<NotificationType, string> = {
  REQUIREMENT_PUBLISHED: "📌",
  SUBMISSION_RECEIVED: "📥",
  INTERVIEW_SCHEDULED: "🎥",
  TIMESHEET_SUBMITTED: "⏱",
  TIMESHEET_APPROVED: "✅",
  INVOICE_GENERATED: "🧾",
  PAYOUT_COMPLETED: "💰",
  MESSAGE_RECEIVED: "💬",
  RATING_RECEIVED: "⭐",
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function NotificationBell(): JSX.Element {
  const [unreadCount, setUnreadCount] = useState(0);
  const [recent, setRecent] = useState<NotificationResponse[]>([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await getNotificationClient().list({ unreadOnly: true, limit: 5 });
      setRecent(res.data);
      setUnreadCount(res.unreadCount);
    } catch {
      // Silently ignore — the navbar bell shouldn't surface network errors.
    }
  }, []);

  useEffect(() => {
    void fetchUnread();
    const id = setInterval(() => void fetchUnread(), POLL_MS);
    return () => clearInterval(id);
  }, [fetchUnread]);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  async function handleClick(n: NotificationResponse) {
    setOpen(false);
    if (!n.readAt) {
      try {
        await getNotificationClient().markRead(n.id);
        setUnreadCount((c) => Math.max(0, c - 1));
        setRecent((list) => list.filter((x) => x.id !== n.id));
      } catch {
        // no-op
      }
    }
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
        className="relative p-2 rounded-lg text-sage-400 hover:text-cream-100 hover:bg-forest-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-300"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 bg-warning rounded-full text-[10px] font-bold text-forest-900 flex items-center justify-center ring-2 ring-forest-800">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-surface rounded-xl shadow-cardHover border border-surface-border z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
            <p className="text-sm font-semibold text-forest-900">Notifications</p>
            {unreadCount > 0 && (
              <span className="text-xs text-sage-500">{unreadCount} unread</span>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {recent.length === 0 ? (
              <div className="px-4 py-8 text-center text-sage-500 text-sm">
                No new notifications
              </div>
            ) : (
              recent.map((n) => {
                const content = (
                  <div className="px-4 py-3 border-b border-surface-border/50 hover:bg-cream-50 flex items-start gap-3">
                    <span className="text-xl shrink-0">{TYPE_ICONS[n.type]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-forest-900 truncate">{n.title}</p>
                        <span className="text-[10px] text-sage-500 shrink-0">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-xs text-sage-600 mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-forest-700 shrink-0 mt-2" />
                  </div>
                );
                return n.linkUrl ? (
                  <Link key={n.id} href={n.linkUrl} onClick={() => handleClick(n)} className="block">
                    {content}
                  </Link>
                ) : (
                  <button key={n.id} type="button" onClick={() => handleClick(n)} className="block w-full text-left">
                    {content}
                  </button>
                );
              })
            )}
          </div>
          <div className="px-4 py-2.5 border-t border-surface-border bg-cream-50">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-forest-700 hover:text-forest-900"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
