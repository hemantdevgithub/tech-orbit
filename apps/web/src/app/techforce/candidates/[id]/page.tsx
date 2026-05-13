"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge, Card, CardBody, CardHeader, CardTitle } from "@techorbit/ui";
import type {
  CandidateProfileResponse,
  InterviewSummary,
  PublicCandidateProfile,
} from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { getProfileClient } from "@/lib/api-client";
import { UserRatingsPanel } from "@/components/user-ratings-panel";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FeaturedInterviewsPanel } from "@/components/featured-interviews-panel";

const WORK_AUTH_LABELS: Record<string, string> = {
  US_CITIZEN: "US Citizen",
  GREEN_CARD: "Green Card",
  H1B: "H1B",
  L1: "L1",
  OPT: "OPT",
  CPT: "CPT",
  TN: "TN Visa",
  OTHER: "Other",
};

const SENIORITY_LABELS: Record<string, string> = {
  JUNIOR: "Junior",
  MID: "Mid-level",
  SENIOR: "Senior",
  STAFF: "Staff",
  PRINCIPAL: "Principal",
  PARTNER: "Partner",
};

function formatRate(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return `$${min}–$${max}/hr`;
  if (min !== null) return `$${min}+/hr`;
  if (max !== null) return `Up to $${max}/hr`;
  return "—";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function CandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const [profile, setProfile] = useState<CandidateProfileResponse | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicCandidateProfile | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    const client = getProfileClient();
    // Fetch in parallel — public is accessible to any authed viewer;
    // the full profile only resolves for self/admin/CRM/SRM. The page
    // degrades gracefully to the public subset when the full fetch 403s.
    Promise.allSettled([
      client.getCandidateByUserId(params.id),
      client.getPublicCandidate(params.id),
    ])
      .then(([fullRes, publicRes]) => {
        if (fullRes.status === "fulfilled") setProfile(fullRes.value);
        if (publicRes.status === "fulfilled") setPublicProfile(publicRes.value);
        if (fullRes.status === "rejected" && publicRes.status === "rejected") {
          const err = publicRes.reason;
          setError(err instanceof ApiError ? err.message : "Not found");
        }
      })
      .finally(() => setLoading(false));
  }, [params?.id]);

  if (loading) return <p className="text-sage-600">Loading…</p>;
  if (!profile && !publicProfile) {
    return (
      <Card>
        <CardBody className="text-red-700">{error ?? "Candidate not found"}</CardBody>
      </Card>
    );
  }
  if (!profile && publicProfile) {
    return <PublicOnlyView pub={publicProfile} />;
  }
  if (!profile) return null;
  const featured: InterviewSummary[] = publicProfile?.featuredInterviews ?? [];

  const prefs = [
    profile.preferRemote && "Remote",
    profile.preferHybrid && "Hybrid",
    profile.preferOnsite && "On-site",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/techforce/dashboard" },
          { label: "Candidates" },
          { label: profile.headline ?? "Candidate" },
        ]}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-forest-900">
            {profile.headline ?? "Candidate"}
          </h1>
          <p className="text-sage-500 text-xs mt-1 font-mono">{profile.userId}</p>
          {profile.location && (
            <p className="text-sage-700 text-sm mt-2">📍 {profile.location}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {profile.kycVerified && <Badge variant="success">KYC verified</Badge>}
          {profile.backgroundCheckStatus === "CLEAR" && (
            <Badge variant="success">Background check clear</Badge>
          )}
          {profile.seniority && (
            <Badge variant="mint">{SENIORITY_LABELS[profile.seniority] ?? profile.seniority}</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          {profile.bio && (
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-sage-800 whitespace-pre-wrap">{profile.bio}</p>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
            </CardHeader>
            <CardBody>
              {profile.skills.length ? (
                <div className="flex flex-wrap gap-1">
                  {profile.skills.map((s) => (
                    <Badge key={s} variant="mint">
                      {s}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sage-500 text-sm">No skills listed.</p>
              )}
            </CardBody>
          </Card>

          {featured.length > 0 && (
            <FeaturedInterviewsPanel
              title="Featured interviews"
              interviews={featured}
            />
          )}

          <UserRatingsPanel userId={profile.userId} title="Ratings & reviews" />
        </div>

        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Engagement</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-sage-600">Rate</dt>
                  <dd className="font-medium text-forest-900 mt-0.5">
                    {formatRate(profile.rateMin, profile.rateMax)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sage-600">Work preference</dt>
                  <dd className="flex flex-wrap gap-1 mt-1">
                    {prefs.length ? (
                      prefs.map((p) => (
                        <Badge key={p} variant="cream">
                          {p}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sage-500">—</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sage-600">Available from</dt>
                  <dd className="font-medium text-forest-900 mt-0.5">
                    {formatDate(profile.availableFrom)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sage-600">Work authorization</dt>
                  <dd className="font-medium text-forest-900 mt-0.5">
                    {profile.workAuthStatus
                      ? WORK_AUTH_LABELS[profile.workAuthStatus] ?? profile.workAuthStatus
                      : "—"}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Fallback view for viewers who only have public access (e.g. a customer
// browsing a candidate they haven't been matched with yet). Shows the
// narrow public subset with featured interviews and ratings.
function PublicOnlyView({ pub }: { pub: PublicCandidateProfile }): JSX.Element {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/techforce/dashboard" },
          { label: "Candidates" },
          { label: pub.headline ?? "Candidate" },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold text-forest-900">
          {pub.headline ?? "Candidate"}
        </h1>
        <p className="text-sage-500 text-xs mt-1 font-mono">{pub.userId}</p>
        {pub.location && (
          <p className="text-sage-700 text-sm mt-2">📍 {pub.location}</p>
        )}
        {pub.seniority && (
          <div className="mt-2">
            <Badge variant="mint">
              {SENIORITY_LABELS[pub.seniority] ?? pub.seniority}
            </Badge>
          </div>
        )}
      </div>

      {pub.featuredInterviews.length > 0 && (
        <FeaturedInterviewsPanel
          title="Featured interviews"
          interviews={pub.featuredInterviews}
        />
      )}

      <UserRatingsPanel userId={pub.userId} title="Ratings & reviews" />
    </div>
  );
}
