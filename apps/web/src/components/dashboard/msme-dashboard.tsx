"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader, CardTitle, Button, Badge } from "@techorbit/ui";
import type { BenchEntryResponse } from "@techorbit/types";
import { getProfileClient } from "@/lib/api-client";
import { VendorEarningsCards } from "./earnings-cards";

const AVAILABILITY_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  ENGAGED: "Engaged",
  NOTICE_PERIOD: "Notice period",
  UNAVAILABLE: "Unavailable",
};

export function MsmeDashboard() {
  const [benchEntries, setBenchEntries] = useState<BenchEntryResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfileClient()
      .getBenchEntries()
      .then((res) => setBenchEntries(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <VendorEarningsCards />

      {/* Bench roster */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bench roster</CardTitle>
            <Button size="sm" disabled>+ Add consultant</Button>
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-sage-500 text-sm">Loading…</p>
          ) : benchEntries.length === 0 ? (
            <p className="text-sage-500 text-sm">No bench entries yet. Add consultants you have available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-sage-500 border-b border-sage-200">
                    <th className="pb-2 font-medium">Consultant ID</th>
                    <th className="pb-2 font-medium">Availability</th>
                    <th className="pb-2 font-medium">Rate range</th>
                    <th className="pb-2 font-medium">Skills</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage-100">
                  {benchEntries.map((e) => (
                    <tr key={e.id}>
                      <td className="py-3 text-forest-800 font-mono text-xs">{e.candidateUserId.slice(0, 8)}…</td>
                      <td className="py-3">
                        <Badge variant={e.availability === "AVAILABLE" ? "success" : "muted"}>
                          {AVAILABILITY_LABELS[e.availability] ?? e.availability}
                        </Badge>
                      </td>
                      <td className="py-3 text-sage-700">
                        {e.expectedRateMin && e.expectedRateMax
                          ? `$${e.expectedRateMin}–$${e.expectedRateMax}/hr`
                          : "—"}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {e.skills.slice(0, 3).map((s) => (
                            <span key={s} className="bg-forest-100 text-forest-700 text-xs px-2 py-0.5 rounded-full">{s}</span>
                          ))}
                          {e.skills.length > 3 && (
                            <span className="text-sage-500 text-xs">+{e.skills.length - 3}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Active submissions placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Active submissions</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="text-center py-8 text-sage-500">
            <p className="text-lg mb-1">📋</p>
            <p className="font-medium">Coming in Sprint 3</p>
            <p className="text-sm">Submitted candidates will appear here</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
