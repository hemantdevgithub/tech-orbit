"use client";

import { Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";

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
      {/* Availability calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Availability — next 7 days</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-7 gap-1">
            {next7.map(({ label, date }) => (
              <div
                key={date.toISOString()}
                className="flex flex-col items-center gap-1"
              >
                <span className="text-xs text-sage-500">{label.slice(0, 3)}</span>
                <span className="text-sm font-medium text-forest-800">
                  {date.getDate()}
                </span>
                <div className="w-8 h-8 rounded-full border-2 border-dashed border-sage-300 hover:border-forest-400 cursor-pointer transition-colors" />
              </div>
            ))}
          </div>
          <p className="text-xs text-sage-400 mt-3 text-center">
            Full availability editor available in interview profile settings
          </p>
        </CardBody>
      </Card>

      {/* Earnings summary */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: "Upcoming", value: "$0" },
              { label: "Pending payout", value: "$0" },
              { label: "Total earned", value: "$0" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-2xl font-bold text-forest-900">{value}</p>
                <p className="text-xs text-sage-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-sage-400 mt-4 text-center">
            Payouts begin when your first interview is completed
          </p>
        </CardBody>
      </Card>

      {/* Scheduled interviews placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled interviews</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="text-center py-8 text-sage-500">
            <p className="text-lg mb-1">🎯</p>
            <p className="font-medium">Coming in Sprint 5</p>
            <p className="text-sm">Your upcoming interview schedule will appear here</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
