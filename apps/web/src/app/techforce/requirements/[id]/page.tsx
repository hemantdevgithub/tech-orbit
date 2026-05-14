"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from "@techorbit/ui";
import type {
  CrmAttributionRequestResponse,
  RequirementResponse,
  RequirementStatus,
  SrmPortfolioMembershipResponse,
} from "@techorbit/types";
import {
  getMatchingClient,
  getProfileClient,
  getRequirementClient,
} from "@/lib/api-client";
import { ApiError } from "@techorbit/api-client";
import { useAuthStore } from "@/store/auth.store";
import { Breadcrumbs } from "@/components/breadcrumbs";

const STATUS_VARIANT: Record<
  RequirementStatus,
  "mint" | "cream" | "muted" | "success" | "warning" | "danger"
> = {
  DRAFT: "muted",
  OPEN: "mint",
  INTERVIEWING: "cream", // Sprint 11: interviews hidden, enum value retained for legacy rows
  OFFER_EXTENDED: "warning",
  PLACED: "success",
  CLOSED: "muted",
  CANCELLED: "danger",
};

export default function RequirementDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuthStore();

  const [req, setReq] = useState<RequirementResponse | null>(null);
  const [pendingClaim, setPendingClaim] =
    useState<CrmAttributionRequestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function load(): Promise<void> {
    if (!params?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getRequirementClient().getById(params.id);
      setReq(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load requirement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [params?.id]);

  async function onPublish(): Promise<void> {
    if (!req) return;
    setWorking(true);
    setError(null);
    try {
      const updated = await getRequirementClient().publish(req.id);
      setReq(updated);
      setNotice("Requirement published.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to publish");
    } finally {
      setWorking(false);
    }
  }

  async function onClose(): Promise<void> {
    if (!req) return;
    const reason = window.prompt("Reason for closing this requirement?");
    if (!reason || !reason.trim()) return;
    setWorking(true);
    setError(null);
    try {
      const updated = await getRequirementClient().close(req.id, { reason: reason.trim() });
      setReq(updated);
      setNotice("Requirement closed.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to close");
    } finally {
      setWorking(false);
    }
  }

  async function onClaimAttribution(): Promise<void> {
    if (!req || !user) return;
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      const result = await getRequirementClient().claimAttribution(req.id, {
        crmUserId: user.id,
      });
      if (result.kind === "attributed") {
        setReq(result.requirement);
        setNotice("You are now the attributed CRM on this requirement.");
      } else {
        setPendingClaim(result.request);
        setNotice("Attribution requested — waiting for customer approval.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to claim attribution");
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return <p className="text-sage-600">Loading…</p>;
  }
  if (error && !req) {
    return (
      <Card>
        <CardBody className="text-red-700">{error}</CardBody>
      </Card>
    );
  }
  if (!req) return null;

  const isOwner = user?.id === req.createdByUserId;
  const isAttributedCrm = user?.id === req.attributedCrmId;
  const isCrm = user?.roles?.some((r) => r.roleType === "CRM");
  const canSubmitCandidates = user?.roles?.some(
    (r) =>
      r.roleType === "CANDIDATE" ||
      r.roleType === "SRM" ||
      r.roleType === "MSME",
  );
  const locationLabel =
    req.locationType === "REMOTE"
      ? "Remote"
      : [req.locationCity, req.locationState].filter(Boolean).join(", ") ||
        req.locationType;
  // Show a friendly label for the company. We don't have company-name
  // lookup wired into requirement-svc yet, so we pick between:
  //   - "Confidential" for blind postings the viewer isn't owner/CRM on
  //   - "Your company" when the viewer is the owner
  //   - a short ID tag otherwise (still useful for link-chasing)
  const companyLabel = (() => {
    if (req.blindPosting && !isOwner && !isAttributedCrm) return "Confidential";
    if (isOwner) return "Your company";
    if (!req.customerCompanyId) return "Confidential";
    return `#${req.customerCompanyId.slice(0, 8)}`;
  })();

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/techforce/dashboard" },
          { label: "Requirements", href: "/techforce/requirements" },
          { label: req.title },
        ]}
      />

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-forest-900">{req.title}</h1>
          <div className="mt-2 flex items-center gap-2 text-sage-600">
            <Badge variant={STATUS_VARIANT[req.status]}>{req.status}</Badge>
            <span>·</span>
            <span>
              {req.publishedAt
                ? `Published ${new Date(req.publishedAt).toLocaleDateString()}`
                : "Draft"}
            </span>
            <span>·</span>
            <span>Company: {companyLabel}</span>
          </div>
        </div>
      </div>

      {notice && (
        <div className="mb-4 p-3 rounded bg-mint-200 text-forest-900 text-sm">{notice}</div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-800 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="prose prose-sage max-w-none">
                <ReactMarkdown>{req.description}</ReactMarkdown>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Key details</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="grid grid-cols-2 gap-y-3 text-sm">
                <dt className="text-sage-600">Tech stack</dt>
                <dd className="flex flex-wrap gap-1">
                  {req.techStack.map((s) => (
                    <Badge key={s} variant="mint">{s}</Badge>
                  ))}
                </dd>

                <dt className="text-sage-600">Seniority</dt>
                <dd><Badge variant="cream">{req.seniority}</Badge></dd>

                <dt className="text-sage-600">Location</dt>
                <dd>{locationLabel}</dd>

                <dt className="text-sage-600">Bill rate</dt>
                <dd>${req.billRateMinUsd}–${req.billRateMaxUsd}/hr</dd>

                <dt className="text-sage-600">Duration</dt>
                <dd>{req.durationWeeks} weeks · Starts {new Date(req.startDate).toLocaleDateString()}</dd>

                <dt className="text-sage-600">Openings</dt>
                <dd>{req.openings}</dd>

                <dt className="text-sage-600">Interviews required</dt>
                <dd>{req.requiredInterviews}</dd>

                <dt className="text-sage-600">Work authorization</dt>
                <dd>
                  {req.workAuthPrefs.length === 0
                    ? "Any"
                    : req.workAuthPrefs.map((w) => (
                        <Badge key={w} variant="muted">{w}</Badge>
                      ))}
                </dd>
              </dl>

              {req.closedReason && (
                <div className="mt-4 p-3 rounded bg-sage-100 text-forest-900 text-sm">
                  <strong>Closed reason:</strong> {req.closedReason}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle>Owner actions</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2">
                {req.status === "DRAFT" && (
                  <>
                    <Button className="w-full" onClick={onPublish} disabled={working}>
                      Publish
                    </Button>
                    <Link href={`/techforce/requirements/${req.id}/edit`} className="block">
                      <Button variant="secondary" className="w-full">Edit draft</Button>
                    </Link>
                  </>
                )}
                {req.status !== "DRAFT" && req.status !== "CLOSED" && req.status !== "CANCELLED" && (
                  <Button variant="secondary" className="w-full" onClick={onClose} disabled={working}>
                    Close requirement
                  </Button>
                )}
              </CardBody>
            </Card>
          )}

          {isCrm && !isOwner && req.status !== "DRAFT" && (
            <Card>
              <CardHeader>
                <CardTitle>CRM attribution</CardTitle>
              </CardHeader>
              <CardBody>
                {isAttributedCrm ? (
                  <Badge variant="success">Attributed to you</Badge>
                ) : req.attributedCrmId ? (
                  <p className="text-sage-600 text-sm">
                    Already attributed to another CRM.
                  </p>
                ) : pendingClaim ? (
                  <Badge variant="warning">Pending customer approval</Badge>
                ) : (
                  <Button className="w-full" onClick={onClaimAttribution} disabled={working}>
                    Claim attribution
                  </Button>
                )}
              </CardBody>
            </Card>
          )}

          {canSubmitCandidates && req.status === "OPEN" && (
            <Card>
              <CardHeader>
                <CardTitle>Submit a candidate</CardTitle>
              </CardHeader>
              <CardBody>
                <Link href={`/techforce/requirements/${req.id}/submit`} className="block">
                  <Button className="w-full">Submit candidate</Button>
                </Link>
              </CardBody>
            </Card>
          )}

          {/* Sprint 12 — assigned SRM picks from their approved portfolio. */}
          {req.assignedSrmId === user?.id && req.status === "OPEN" && (
            <AssignedSrmActions requirementId={req.id} />
          )}

          {isOwner && req.status !== "DRAFT" && (
            <Card>
              <CardHeader>
                <CardTitle>Shortlist</CardTitle>
              </CardHeader>
              <CardBody>
                <Link href={`/techforce/requirements/${req.id}/shortlist`} className="block">
                  <Button variant="secondary" className="w-full">
                    View shortlist
                  </Button>
                </Link>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Sprint 12 — Two pickers shown to the SRM currently assigned to this
// requirement: invite a candidate from their portfolio, or assign an MSME.
// Both lists come from /api/v1/me/srm-roster?status=APPROVED. Memberships
// not yet APPROVED are filtered out — backend will reject anyway.
function AssignedSrmActions({ requirementId }: { requirementId: string }) {
  const [candidates, setCandidates] = useState<SrmPortfolioMembershipResponse[]>([]);
  const [msmes, setMsmes] = useState<SrmPortfolioMembershipResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const client = getProfileClient();
    Promise.all([
      client.listSrmRoster({ status: "APPROVED", memberType: "CANDIDATE" }),
      client.listSrmRoster({ status: "APPROVED", memberType: "MSME" }),
    ])
      .then(([c, m]) => {
        if (cancelled) return;
        setCandidates(c.data);
        setMsmes(m.data);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setErr(e instanceof ApiError ? e.message : "Failed to load roster");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function invite(candidateId: string) {
    setWorking(`c:${candidateId}`);
    setErr(null);
    try {
      await getMatchingClient().inviteCandidate(requirementId, { candidateId });
      setNotice("Invitation sent.");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to invite");
    } finally {
      setWorking(null);
    }
  }

  async function assignMsme(msmePrimaryUserId: string) {
    setWorking(`m:${msmePrimaryUserId}`);
    setErr(null);
    try {
      await getMatchingClient().assignToMsme(requirementId, { msmePrimaryUserId });
      setNotice("MSME assigned.");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to assign");
    } finally {
      setWorking(null);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Invite candidate</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {notice && (
            <p className="text-mint-700 text-xs">{notice}</p>
          )}
          {err && <p className="text-danger text-xs">{err}</p>}
          {loading ? (
            <p className="text-sage-500 text-sm">Loading roster…</p>
          ) : candidates.length === 0 ? (
            <p className="text-sage-500 text-sm">
              No approved candidates in your roster yet.{" "}
              <Link href="/techforce/roster" className="text-forest-700 hover:underline">
                Add one →
              </Link>
            </p>
          ) : (
            <ul className="space-y-1.5">
              {candidates.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="font-mono text-xs text-forest-800 truncate">
                    {c.memberUserId.slice(0, 8)}…
                  </span>
                  <Button
                    size="sm"
                    onClick={() => invite(c.memberUserId)}
                    disabled={working === `c:${c.memberUserId}`}
                  >
                    Invite
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assign MSME</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {loading ? (
            <p className="text-sage-500 text-sm">Loading roster…</p>
          ) : msmes.length === 0 ? (
            <p className="text-sage-500 text-sm">
              No approved MSMEs in your roster yet.{" "}
              <Link href="/techforce/roster" className="text-forest-700 hover:underline">
                Add one →
              </Link>
            </p>
          ) : (
            <ul className="space-y-1.5">
              {msmes.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="font-mono text-xs text-forest-800 truncate">
                    {m.memberUserId.slice(0, 8)}…
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => assignMsme(m.memberUserId)}
                    disabled={working === `m:${m.memberUserId}`}
                  >
                    Assign
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}
