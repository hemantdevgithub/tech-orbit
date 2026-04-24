"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import type {
  RequirementResponse,
  CrmAttributionRequestResponse,
} from "@techorbit/types";
import { getRequirementClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";
import { BrokerEarningsCards } from "./earnings-cards";

export function CrmDashboard() {
  const me = useAuthStore((s) => s.user);
  const [attributedReqs, setAttributedReqs] = useState<RequirementResponse[]>([]);
  const [pendingAttributions, setPendingAttributions] = useState<
    CrmAttributionRequestResponse[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!me) return;
    Promise.all([
      getRequirementClient()
        .list({ attributedCrmId: me.id, limit: 10 })
        .then((r) => r.data)
        .catch(() => []),
      getRequirementClient()
        .listPendingAttributions()
        .then((r) => r.data)
        .catch(() => []),
    ])
      .then(([reqs, attrs]) => {
        setAttributedReqs(reqs);
        setPendingAttributions(attrs);
      })
      .finally(() => setLoading(false));
  }, [me]);

  const openAttributedReqs = attributedReqs.filter(
    (r) => r.status === "OPEN" || r.status === "DRAFT",
  );

  return (
    <div className="space-y-6">
      <BrokerEarningsCards />

      <Card>
        <CardHeader>
          <CardTitle>Attribution requests</CardTitle>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-sage-500 text-sm">Loading…</p>
          ) : pendingAttributions.length === 0 ? (
            <p className="text-sage-600 text-sm">
              No pending attribution requests. When you claim a customer or
              requirement, the approval state shows here.
            </p>
          ) : (
            <ul className="divide-y divide-sage-100">
              {pendingAttributions.slice(0, 5).map((a) => (
                <li key={a.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-forest-900 text-sm truncate">
                      Requirement {a.requirementId.slice(0, 8)}…
                    </p>
                    <p className="text-xs text-sage-600 mt-0.5">
                      Status: <span className="font-medium">{a.status}</span>
                      {a.createdAt && (
                        <> · Submitted {new Date(a.createdAt).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/requirements/${a.requirementId}`}
                    className="text-sm text-forest-700 hover:underline shrink-0"
                  >
                    View →
                  </Link>
                </li>
              ))}
              {pendingAttributions.length > 5 && (
                <li className="py-3 text-xs text-sage-500">
                  +{pendingAttributions.length - 5} more pending
                </li>
              )}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your attributed requirements</CardTitle>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-sage-500 text-sm">Loading…</p>
          ) : openAttributedReqs.length === 0 ? (
            <div className="text-center py-6 text-sage-500">
              <p className="text-2xl mb-1">🤝</p>
              <p className="text-sm">No attributed requirements yet.</p>
              <Link
                href="/requirements"
                className="text-sm text-forest-700 hover:underline mt-2 inline-block"
              >
                Browse open requirements →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-sage-100">
              {openAttributedReqs.slice(0, 5).map((r) => (
                <li key={r.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-forest-900 text-sm truncate">
                      {r.title}
                    </p>
                    <p className="text-xs text-sage-600 mt-0.5">
                      {r.seniority} · {r.locationType} · {r.status}
                    </p>
                  </div>
                  <Link
                    href={`/requirements/${r.id}`}
                    className="text-sm text-forest-700 hover:underline shrink-0"
                  >
                    View →
                  </Link>
                </li>
              ))}
              {openAttributedReqs.length > 5 && (
                <li className="py-3 text-xs text-sage-500 text-center">
                  +{openAttributedReqs.length - 5} more
                </li>
              )}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
