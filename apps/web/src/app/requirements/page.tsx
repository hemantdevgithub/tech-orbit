"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Badge,
} from "@techorbit/ui";
import type {
  RequirementFilter,
  RequirementResponse,
  LocationType,
  RequirementStatus,
  Seniority,
} from "@techorbit/types";
import { TECH_STACK_OPTIONS } from "@techorbit/types";
import { getRequirementClient } from "@/lib/api-client";
import { ApiError } from "@techorbit/api-client";
import { useAuthStore } from "@/store/auth.store";

const STATUS_OPTIONS: RequirementStatus[] = [
  "DRAFT",
  "OPEN",
  "INTERVIEWING",
  "OFFER_EXTENDED",
  "PLACED",
  "CLOSED",
  "CANCELLED",
];

const SENIORITY_OPTIONS: Seniority[] = ["JUNIOR", "MID", "SENIOR", "STAFF", "PRINCIPAL"];
const LOCATION_OPTIONS: LocationType[] = ["ONSITE", "HYBRID", "REMOTE"];

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

export default function BrowseRequirementsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [rows, setRows] = useState<RequirementResponse[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<RequirementStatus | "">("OPEN");
  const [seniority, setSeniority] = useState<Seniority | "">("");
  const [locationType, setLocationType] = useState<LocationType | "">("");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const filters: RequirementFilter = useMemo(
    () => ({
      ...(status ? { status } : {}),
      ...(seniority ? { seniority } : {}),
      ...(locationType ? { locationType } : {}),
      ...(techStack.length > 0 ? { techStack } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
      limit: 20,
    }),
    [status, seniority, locationType, techStack, search],
  );

  async function load(replace: boolean): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const res = await getRequirementClient().list({
        ...filters,
        ...(replace ? {} : cursor ? { cursor } : {}),
      });
      setRows(replace ? res.data : [...rows, ...res.data]);
      setCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load requirements");
    } finally {
      setLoading(false);
    }
  }

  // Reload from scratch whenever any filter changes.
  useEffect(() => {
    setCursor(null);
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, seniority, locationType, techStack.join(","), search]);

  function toggleTech(skill: string): void {
    setTechStack((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  }

  function clearFilters(): void {
    setStatus("");
    setSeniority("");
    setLocationType("");
    setTechStack([]);
    setSearch("");
  }

  const isCustomer = user?.roles?.some((r) => r.roleType === "CUSTOMER");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-forest-900">Requirements</h1>
          <p className="text-sage-600 mt-1">
            {loading ? "Loading…" : `${rows.length} shown${hasMore ? " (more available)" : ""}`}
          </p>
        </div>
        {isCustomer && (
          <Button onClick={() => router.push("/requirements/new")}>Post a requirement</Button>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as RequirementStatus | "")}
                className="w-full px-3 py-2 border border-sage-300 rounded-md"
              >
                <option value="">Any</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="seniority">Seniority</Label>
              <select
                id="seniority"
                value={seniority}
                onChange={(e) => setSeniority(e.target.value as Seniority | "")}
                className="w-full px-3 py-2 border border-sage-300 rounded-md"
              >
                <option value="">Any</option>
                {SENIORITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="locationType">Location</Label>
              <select
                id="locationType"
                value={locationType}
                onChange={(e) => setLocationType(e.target.value as LocationType | "")}
                className="w-full px-3 py-2 border border-sage-300 rounded-md"
              >
                <option value="">Any</option>
                {LOCATION_OPTIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Title or description"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-3">
            <Label>Tech stack</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {TECH_STACK_OPTIONS.map((s) => {
                const active = techStack.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleTech(s)}
                    className="focus:outline-none"
                  >
                    <Badge variant={active ? "mint" : "muted"}>{s}</Badge>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>
          </div>
        </CardBody>
      </Card>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-800 text-sm">{error}</div>
      )}

      {!loading && rows.length === 0 ? (
        <Card>
          <CardBody className="text-center py-10 text-sage-600">
            No requirements match your filters. Clear filters or check back later.
          </CardBody>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-mint-100 text-forest-900">
                <tr>
                  <th className="text-left px-4 py-2">Title</th>
                  <th className="text-left px-4 py-2">Tech stack</th>
                  <th className="text-left px-4 py-2">Seniority</th>
                  <th className="text-left px-4 py-2">Location</th>
                  <th className="text-left px-4 py-2">Rate</th>
                  <th className="text-left px-4 py-2">Openings</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Published</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-sage-200 hover:bg-mint-50 cursor-pointer"
                    onClick={() => router.push(`/requirements/${r.id}`)}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/requirements/${r.id}`} className="font-medium text-forest-900 hover:underline">
                        {r.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.techStack.slice(0, 3).map((s) => (
                          <Badge key={s} variant="mint">{s}</Badge>
                        ))}
                        {r.techStack.length > 3 && (
                          <span className="text-sage-600">+{r.techStack.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{r.seniority}</td>
                    <td className="px-4 py-3">
                      {r.locationType === "REMOTE"
                        ? "Remote"
                        : r.locationCity
                          ? `${r.locationCity}, ${r.locationState ?? ""}`
                          : r.locationType}
                    </td>
                    <td className="px-4 py-3">
                      ${r.billRateMinUsd}–${r.billRateMaxUsd}/hr
                    </td>
                    <td className="px-4 py-3">{r.openings}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sage-600">
                      {r.publishedAt ? new Date(r.publishedAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="p-4 text-center">
              <Button variant="secondary" onClick={() => load(false)} disabled={loading}>
                {loading ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
