"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
} from "@techorbit/types";
import { getRequirementClient } from "@/lib/api-client";
import { ApiError } from "@techorbit/api-client";
import { useAuthStore } from "@/store/auth.store";

const STATUS_VARIANT: Record<
  RequirementStatus,
  "mint" | "cream" | "muted" | "success" | "warning" | "danger"
> = {
  DRAFT: "muted",
  OPEN: "mint",
  INTERVIEWING: "cream",
  OFFER_EXTENDED: "warning",
  PLACED: "success",
  CLOSED: "muted",
  CANCELLED: "danger",
};

export default function RequirementDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const isCandidateOrSrm = user?.roles?.some(
    (r) => r.roleType === "CANDIDATE" || r.roleType === "SRM",
  );
  const locationLabel =
    req.locationType === "REMOTE"
      ? "Remote"
      : [req.locationCity, req.locationState].filter(Boolean).join(", ") ||
        req.locationType;
  const companyLabel =
    req.blindPosting && !isOwner && !isAttributedCrm
      ? "Confidential"
      : (req.customerCompanyId ?? "Confidential");

  return (
    <div>
      <div className="mb-4">
        <Link href="/requirements" className="text-sm text-forest-700 hover:underline">
          ← All requirements
        </Link>
      </div>

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
                    <Link href={`/requirements/${req.id}/edit`} className="block">
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

          {isCandidateOrSrm && req.status === "OPEN" && (
            <Card>
              <CardHeader>
                <CardTitle>Submit a candidate</CardTitle>
              </CardHeader>
              <CardBody>
                <Button className="w-full" disabled title="Available in Sprint 4">
                  Submit candidate
                </Button>
                <p className="text-xs text-sage-600 mt-2">
                  Candidate submissions open in Sprint 4.
                </p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
