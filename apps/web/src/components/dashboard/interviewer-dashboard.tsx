"use client";

import Link from "next/link";
import { DashboardHeader, WorkspaceCard, StatStrip } from "./dashboard-shell";
import {
  CalendarIcon,
  TargetIcon,
  DollarIcon,
  UserIcon,
  MessageIcon,
  BellIcon,
} from "@/components/icons";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getNext7Days(): { label: string; date: Date }[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1] ?? "",
      date: d,
    };
  });
}

export function InterviewerDashboard() {
  const next7 = getNext7Days();

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Interviewer Dashboard"
        subtitle="Manage your availability, interviews and earnings."
        action={
          <Link
            href="/dashboard/interviewer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-forest-800 text-cream-100 text-sm font-semibold hover:bg-forest-700 transition-colors"
          >
            <CalendarIcon size={16} /> Set availability
          </Link>
        }
      />

      {/* Workspace */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-sage-400 mb-3">Workspace</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <WorkspaceCard icon={<CalendarIcon size={18} />} title="Availability" subtitle="Set your schedule" href="/dashboard/interviewer" />
          <WorkspaceCard icon={<TargetIcon size={18} />} title="Interviews" subtitle="Upcoming sessions" href="/interviews" />
          <WorkspaceCard icon={<TargetIcon size={18} />} title="Past interviews" subtitle="History & ratings" href="/interviews" />
          <WorkspaceCard icon={<DollarIcon size={18} />} title="Payouts" subtitle="Earnings & history" href="/payouts" />
          <WorkspaceCard icon={<UserIcon size={18} />} title="Profile" subtitle="Your public listing" href="/settings/profile" />
          <WorkspaceCard icon={<MessageIcon size={18} />} title="Messages" subtitle="Inbox & threads" href="/messages" />
        </div>
      </section>

      {/* Pipeline overview */}
      <StatStrip
        title="Pipeline overview"
        stats={[
          { label: "Upcoming interviews", value: 0, href: "/interviews" },
          { label: "Pending payout", value: "$0", href: "/payouts" },
          { label: "Total earned", value: "$0", href: "/payouts" },
        ]}
      />

      {/* 7-day availability preview */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-sage-400">This week</p>
          <Link href="/dashboard/interviewer" className="text-xs text-forest-700 hover:underline">Manage availability →</Link>
        </div>
        <div className="bg-white rounded-xl border border-sage-200 p-5">
          <div className="grid grid-cols-7 gap-2">
            {next7.map(({ label, date }) => (
              <div key={date.toISOString()} className="flex flex-col items-center gap-2">
                <span className="text-xs text-sage-400">{label.slice(0, 3)}</span>
                <div className="w-9 h-9 rounded-full border-2 border-dashed border-sage-200 hover:border-forest-400 flex items-center justify-center cursor-pointer transition-colors">
                  <span className="text-xs font-medium text-forest-700">{date.getDate()}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-sage-400 mt-4 text-center">
            Click a day to mark your availability · Customers book interviews from your open slots
          </p>
        </div>
      </section>
    </div>
  );
}
