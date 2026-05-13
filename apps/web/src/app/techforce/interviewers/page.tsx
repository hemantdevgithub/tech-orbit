"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, CardBody, CardHeader, CardTitle, Input, Label } from "@techorbit/ui";
import type { InterviewerProfileResponse } from "@techorbit/types";
import { ApiError } from "@techorbit/api-client";
import { getProfileClient } from "@/lib/api-client";
import { ViewToggle, useViewMode } from "@/components/view-toggle";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default function InterviewersPage() {
  const [interviewers, setInterviewers] = useState<InterviewerProfileResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [viewMode, setViewMode] = useViewMode("interviewers-view", "list");

  async function loadPage(cursor?: string) {
    setLoading(true);
    setError(null);
    try {
      const result = await getProfileClient().listInterviewers({
        specializations: search.trim() ? [search.trim()] : undefined,
        cursor,
        limit: 20,
      });
      setInterviewers((prev) => cursor ? [...prev, ...result.data] : result.data);
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load interviewers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, []);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setNextCursor(null);
    void loadPage();
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/techforce/dashboard" },
          { label: "Interviewers" },
        ]}
      />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-forest-900">Interviewer marketplace</h1>
          <p className="text-sage-600 text-sm">Browse verified technical interviewers for your requirements.</p>
        </div>
        {interviewers.length > 0 && <ViewToggle mode={viewMode} onChange={setViewMode} />}
      </div>

      <form onSubmit={onSearch} className="mb-6 flex gap-3 max-w-md">
        <div className="flex-1">
          <Label htmlFor="search" className="sr-only">Filter by specialization</Label>
          <Input
            id="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by specialization (e.g. React)"
          />
        </div>
        <Button type="submit" disabled={loading}>Search</Button>
        {search && (
          <Button type="button" variant="secondary" onClick={() => { setSearch(""); void loadPage(); }}>
            Clear
          </Button>
        )}
      </form>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-800 text-sm">{error}</div>
      )}

      {loading && interviewers.length === 0 ? (
        <p className="text-sage-600">Loading…</p>
      ) : interviewers.length === 0 ? (
        <Card>
          <CardHeader><CardTitle>No interviewers found</CardTitle></CardHeader>
          <CardBody>
            <p className="text-sage-600 text-sm">
              No verified interviewers match your filters. Try clearing filters or check back later.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className={viewMode === "grid" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
          {interviewers.map((iv) => (
            viewMode === "grid" ? (
              <Card key={iv.id} className="h-full">
                <CardBody className="flex flex-col h-full">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-forest-900 truncate">{iv.displayName ?? "Interviewer"}</h3>
                    {iv.linkedinVerified && <Badge variant="success">Verified</Badge>}
                  </div>
                  {iv.headline && <p className="text-sm text-sage-600 line-clamp-2">{iv.headline}</p>}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {iv.specializations.slice(0, 4).map((s) => <Badge key={s} variant="mint">{s}</Badge>)}
                  </div>
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    {iv.perInterviewFeeUsd !== null ? (
                      <p className="text-sm font-semibold text-forest-900">${iv.perInterviewFeeUsd}/interview</p>
                    ) : <span />}
                    <Link href={`/techforce/interviewers/${iv.userId}`}>
                      <Button variant="secondary" size="sm">View →</Button>
                    </Link>
                  </div>
                </CardBody>
              </Card>
            ) : (
              <Card key={iv.id}>
                <CardBody className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-forest-900">{iv.displayName ?? "Interviewer"}</h3>
                      {iv.linkedinVerified && <Badge variant="success">Verified</Badge>}
                    </div>
                    {iv.headline && <p className="text-sm text-sage-600 mt-0.5">{iv.headline}</p>}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {iv.specializations.map((s) => <Badge key={s} variant="mint">{s}</Badge>)}
                      {iv.seniorityLevelsCoverable.map((s) => <Badge key={s} variant="cream">{s}</Badge>)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right space-y-1">
                    {iv.perInterviewFeeUsd !== null && (
                      <p className="text-sm font-semibold text-forest-900">${iv.perInterviewFeeUsd}/interview</p>
                    )}
                    <Link href={`/techforce/interviewers/${iv.userId}`}>
                      <Button variant="secondary" size="sm">View profile</Button>
                    </Link>
                  </div>
                </CardBody>
              </Card>
            )
          ))}

          {hasMore && (
            <div className="text-center pt-2">
              <Button
                variant="secondary"
                disabled={loading}
                onClick={() => void loadPage(nextCursor ?? undefined)}
              >
                {loading ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
