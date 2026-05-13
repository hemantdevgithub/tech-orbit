"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge, Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import type { PublicCustomerProfile } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { getProfileClient } from "@/lib/api-client";
import { UserRatingsPanel } from "@/components/user-ratings-panel";
import { Breadcrumbs } from "@/components/breadcrumbs";

const COMPANY_SIZE_LABELS: Record<string, string> = {
  SIZE_1_10: "1–10",
  SIZE_11_50: "11–50",
  SIZE_51_200: "51–200",
  SIZE_201_500: "201–500",
  SIZE_501_1000: "501–1,000",
  SIZE_1001_PLUS: "1,001+",
};

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicCustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    getProfileClient()
      .getPublicCustomer(params.id)
      .then(setProfile)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Not found"))
      .finally(() => setLoading(false));
  }, [params?.id]);

  if (loading) return <p className="text-sage-600">Loading…</p>;
  if (error || !profile) {
    return (
      <Card>
        <CardBody className="text-red-700">{error ?? "Customer not found"}</CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Customers" },
          { label: profile.legalName },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold text-forest-900">{profile.legalName}</h1>
        {profile.dba && (
          <p className="text-sage-700 mt-1">dba {profile.dba}</p>
        )}
        <p className="text-sage-500 text-xs mt-2 font-mono">{profile.primaryUserId}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company overview</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-sage-600">Industry</dt>
                  <dd className="font-medium text-forest-900 mt-0.5">
                    {profile.industry ?? <span className="text-sage-500 font-normal">—</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-sage-600">Company size</dt>
                  <dd className="mt-1">
                    {profile.companySizeRange ? (
                      <Badge variant="cream">
                        {COMPANY_SIZE_LABELS[profile.companySizeRange] ?? profile.companySizeRange}
                      </Badge>
                    ) : (
                      <span className="text-sage-500">—</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sage-600">Website</dt>
                  <dd className="font-medium text-forest-900 mt-0.5">
                    {profile.website ? (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-forest-700 hover:underline"
                      >
                        {profile.website}
                      </a>
                    ) : (
                      <span className="text-sage-500 font-normal">—</span>
                    )}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <UserRatingsPanel userId={profile.primaryUserId} title="Ratings & reviews" />
        </div>

        <div className="space-y-3">
          <Card>
            <CardBody className="text-xs text-sage-600">
              Showing a limited, public view. Billing details and internal
              attribution are visible only to the company&apos;s own admin and
              their attributed CRM.
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
