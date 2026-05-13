"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import type {
  DashboardMetricsResponse,
  DisputeListResponse,
  RoleApplicationListResponse,
} from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { getAdminClient } from "@/lib/api-client";

function money(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [pendingApps, setPendingApps] = useState<RoleApplicationListResponse["data"]>([]);
  const [recentDisputes, setRecentDisputes] = useState<DisputeListResponse["data"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = getAdminClient();
    Promise.all([
      client.getDashboardMetrics(),
      client.listApplications({ status: "PENDING", limit: 5 }),
      client.listDisputes({ limit: 5 }),
    ])
      .then(([m, apps, disps]) => {
        setMetrics(m);
        setPendingApps(apps.data);
        setRecentDisputes(disps.data);
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sage-500">Loading dashboard…</p>;
  if (error) return <Card><CardBody className="text-danger">{error}</CardBody></Card>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-forest-900">Admin dashboard</h1>
        <p className="text-sage-500 text-sm mt-0.5">Platform operations overview</p>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Pending applications"
          value={metrics?.pendingApplications ?? 0}
          href="/techforce/admin/role-applications?status=PENDING"
          tone={metrics && metrics.pendingApplications > 0 ? "warn" : "default"}
        />
        <MetricCard
          label="Open disputes"
          value={metrics?.openDisputes ?? 0}
          href="/techforce/admin/disputes?status=OPEN"
          tone={metrics && metrics.openDisputes > 0 ? "warn" : "default"}
        />
        <MetricCard
          label="Active users"
          value={metrics?.activeUsers ?? 0}
          href="/techforce/admin/users"
        />
        <MetricCard
          label="GMV this month"
          value={money(metrics?.gmvThisMonthUsd ?? 0)}
          tone="accent"
        />
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Pending role applications</CardTitle>
              <Link href="/techforce/admin/role-applications" className="text-xs text-forest-700 hover:underline">View all →</Link>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {pendingApps.length === 0 ? (
              <p className="p-4 text-sage-500 text-sm">All clear — no pending applications.</p>
            ) : (
              <ul className="divide-y divide-surface-border/50">
                {pendingApps.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/techforce/admin/role-applications/${a.id}`}
                      className="block px-4 py-3 hover:bg-cream-50 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-forest-900 truncate">{a.requestedRole}</p>
                        <p className="text-xs text-sage-500 mt-0.5 font-mono truncate">{a.userId}</p>
                      </div>
                      <span className="text-xs text-sage-500 shrink-0">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Recent disputes</CardTitle>
              <Link href="/techforce/admin/disputes" className="text-xs text-forest-700 hover:underline">View all →</Link>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {recentDisputes.length === 0 ? (
              <p className="p-4 text-sage-500 text-sm">No disputes yet.</p>
            ) : (
              <ul className="divide-y divide-surface-border/50">
                {recentDisputes.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/techforce/admin/disputes/${d.id}`}
                      className="block px-4 py-3 hover:bg-cream-50 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-forest-900">{d.type}</p>
                        <p className="text-xs text-sage-500 mt-0.5 truncate">{d.contextType}</p>
                      </div>
                      <StatusPill status={d.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
        <CardBody className="flex flex-wrap gap-3 text-sm">
          <Link href="/techforce/admin/users" className="px-4 py-2 rounded-lg bg-surface-elevated border border-surface-border hover:border-forest-300 font-medium text-forest-900">
            Search users
          </Link>
          <Link href="/techforce/admin/audit-logs" className="px-4 py-2 rounded-lg bg-surface-elevated border border-surface-border hover:border-forest-300 font-medium text-forest-900">
            Audit logs
          </Link>
          <Link href="/techforce/admin/disputes?status=OPEN" className="px-4 py-2 rounded-lg bg-surface-elevated border border-surface-border hover:border-forest-300 font-medium text-forest-900">
            Open disputes
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: string | number;
  href?: string;
  tone?: "default" | "accent" | "warn";
};

function MetricCard({ label, value, href, tone = "default" }: MetricCardProps) {
  const toneStyles: Record<NonNullable<MetricCardProps["tone"]>, string> = {
    default: "bg-surface border-surface-border hover:border-forest-300",
    accent: "bg-forest-800 border-forest-800 text-cream-100 hover:shadow-cardHover",
    warn: "bg-warning/10 border-warning/30 hover:border-warning/50",
  };
  const labelColor = tone === "accent" ? "text-mint-200" : "text-sage-500";
  const valueColor = tone === "accent" ? "text-cream-100" : tone === "warn" ? "text-warning" : "text-forest-900";

  const content = (
    <div className={`rounded-2xl border p-5 transition-all ${toneStyles[tone]}`}>
      <p className={`text-xs uppercase tracking-wider mb-1 ${labelColor}`}>{label}</p>
      <p className={`text-3xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-warning/15 text-warning border-warning/30",
  UNDER_REVIEW: "bg-info/15 text-info border-info/30",
  RESOLVED: "bg-success/15 text-success border-success/30",
  CLOSED: "bg-surface-soft text-sage-500 border-surface-border",
};

function StatusPill({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? STATUS_COLORS.CLOSED!;
  return (
    <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${cls}`}>
      {status}
    </span>
  );
}
