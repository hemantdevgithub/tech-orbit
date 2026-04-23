"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@techorbit/ui";
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
  "DRAFT", "OPEN", "INTERVIEWING", "OFFER_EXTENDED", "PLACED", "CLOSED", "CANCELLED",
];
const SENIORITY_OPTIONS: Seniority[] = ["JUNIOR", "MID", "SENIOR", "STAFF", "PRINCIPAL"];
const LOCATION_OPTIONS: LocationType[] = ["ONSITE", "HYBRID", "REMOTE"];

const STATUS_STYLES: Record<RequirementStatus, string> = {
  DRAFT:          "bg-surface-soft text-sage-500 border-surface-border",
  OPEN:           "bg-success/10 text-success border-success/30",
  INTERVIEWING:   "bg-info/10 text-info border-info/30",
  OFFER_EXTENDED: "bg-warning/10 text-warning border-warning/30",
  PLACED:         "bg-success/20 text-success border-success/40",
  CLOSED:         "bg-surface-soft text-sage-500 border-surface-border",
  CANCELLED:      "bg-danger/10 text-danger border-danger/20",
};

const LOCATION_ICON: Record<LocationType, string> = {
  REMOTE: "🌍",
  HYBRID: "🏙️",
  ONSITE: "🏢",
};

const SENIORITY_COLOR: Record<string, string> = {
  JUNIOR:    "bg-mint-200 text-forest-700",
  MID:       "bg-forest-100 text-forest-700",
  SENIOR:    "bg-forest-200 text-forest-800",
  STAFF:     "bg-forest-300 text-forest-800",
  PRINCIPAL: "bg-forest-400 text-cream-100",
  PARTNER:   "bg-forest-600 text-cream-100",
};

function RequirementCard({ r }: { r: RequirementResponse }) {
  const router = useRouter();
  const location = r.locationType === "REMOTE"
    ? "Remote"
    : r.locationCity
      ? `${r.locationCity}${r.locationState ? `, ${r.locationState}` : ""}`
      : r.locationType;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/requirements/${r.id}`)}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/requirements/${r.id}`)}
      className="group relative rounded-xl border border-surface-border bg-surface p-5 hover:border-forest-300 hover:shadow-cardHover transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <Link
            href={`/requirements/${r.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-forest-900 hover:text-forest-700 text-base leading-tight line-clamp-1 block"
          >
            {r.title}
          </Link>
          <p className="text-xs text-sage-500 mt-0.5">
            {r.publishedAt
              ? `Posted ${new Date(r.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
              : "Draft"}
            {r.openings > 1 && ` · ${r.openings} openings`}
          </p>
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[r.status]}`}>
          {r.status === "OFFER_EXTENDED" ? "Offer" : r.status.charAt(0) + r.status.slice(1).toLowerCase()}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {r.techStack.slice(0, 4).map((s) => (
          <span key={s} className="px-2 py-0.5 rounded-md bg-mint-100 text-forest-700 text-xs font-medium border border-mint-300">
            {s}
          </span>
        ))}
        {r.techStack.length > 4 && (
          <span className="px-2 py-0.5 rounded-md bg-surface-soft text-sage-500 text-xs">+{r.techStack.length - 4}</span>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-sage-500 flex-wrap">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SENIORITY_COLOR[r.seniority] ?? "bg-surface-soft text-sage-500"}`}>
          {r.seniority}
        </span>
        <span className="flex items-center gap-1">
          {LOCATION_ICON[r.locationType]}&nbsp;{location}
        </span>
        <span className="text-forest-600 font-medium">${r.billRateMinUsd}–${r.billRateMaxUsd}/hr</span>
        <span>{r.durationWeeks}w</span>
      </div>

      <div className="absolute right-4 bottom-4 text-sage-300 group-hover:text-forest-500 transition-colors text-sm">→</div>
    </div>
  );
}

export default function BrowseRequirementsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [rows, setRows] = useState<RequirementResponse[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [status, setStatus] = useState<RequirementStatus | "">("OPEN");
  const [seniority, setSeniority] = useState<Seniority | "">("");
  const [locationType, setLocationType] = useState<LocationType | "">("");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const activeFilterCount = [status && status !== "OPEN", seniority, locationType, techStack.length > 0, search].filter(Boolean).length;

  const filters: RequirementFilter = useMemo(() => ({
    ...(status ? { status } : {}),
    ...(seniority ? { seniority } : {}),
    ...(locationType ? { locationType } : {}),
    ...(techStack.length > 0 ? { techStack } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
    limit: 24,
  }), [status, seniority, locationType, techStack, search]);

  async function load(replace: boolean): Promise<void> {
    setLoading(true); setError(null);
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

  useEffect(() => { setCursor(null); void load(true); }, [status, seniority, locationType, techStack.join(","), search]);

  function toggleTech(skill: string) {
    setTechStack((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]);
  }
  function clearFilters() { setStatus("OPEN"); setSeniority(""); setLocationType(""); setTechStack([]); setSearch(""); }

  const isCustomer = user?.roles?.some((r) => r.roleType === "CUSTOMER");
  const sel = "w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-surface text-forest-900 focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-forest-900">Requirements</h1>
          <p className="text-sage-500 text-sm mt-0.5">
            {loading ? "Loading…" : `${rows.length}${hasMore ? "+" : ""} positions`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              showFilters || activeFilterCount > 0
                ? "bg-forest-800 text-cream-100 border-forest-800"
                : "bg-surface text-forest-800 border-surface-border hover:border-forest-300"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 8h10M11 12h2M9 16h6" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 w-5 h-5 rounded-full bg-warning text-white text-xs flex items-center justify-center font-bold">{activeFilterCount}</span>
            )}
          </button>
          {isCustomer && <Button onClick={() => router.push("/requirements/new")}>+ Post requirement</Button>}
        </div>
      </div>

      {showFilters && (
        <div className="mb-6 rounded-xl border border-surface-border bg-surface p-5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-sage-500 mb-1.5">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as RequirementStatus | "")} className={sel}>
                <option value="">Any</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-sage-500 mb-1.5">Seniority</label>
              <select value={seniority} onChange={(e) => setSeniority(e.target.value as Seniority | "")} className={sel}>
                <option value="">Any</option>
                {SENIORITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-sage-500 mb-1.5">Location</label>
              <select value={locationType} onChange={(e) => setLocationType(e.target.value as LocationType | "")} className={sel}>
                <option value="">Any</option>
                {LOCATION_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-sage-500 mb-1.5">Search</label>
              <input type="search" placeholder="Title or keyword…" value={search} onChange={(e) => setSearch(e.target.value)} className={sel} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-sage-500 mb-2">Tech stack</label>
            <div className="flex flex-wrap gap-1.5">
              {TECH_STACK_OPTIONS.map((s) => {
                const active = techStack.includes(s);
                return (
                  <button key={s} type="button" onClick={() => toggleTech(s)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      active
                        ? "bg-forest-800 text-cream-100 border border-forest-800"
                        : "bg-surface-soft text-sage-500 border border-surface-border hover:border-forest-300 hover:text-forest-700"
                    }`}
                  >{s}</button>
                );
              })}
            </div>
          </div>
          {activeFilterCount > 0 && (
            <div className="flex justify-end">
              <button onClick={clearFilters} className="text-xs text-danger hover:underline">Clear all</button>
            </div>
          )}
        </div>
      )}

      {error && <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm border border-danger/20">{error}</div>}

      {loading && rows.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 rounded-xl bg-surface-soft animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-surface-border bg-surface p-12 text-center">
          <p className="text-3xl mb-3">🔍</p>
          <p className="font-semibold text-forest-900 mb-1">No requirements found</p>
          <p className="text-sage-500 text-sm mb-4">Try different filters or check back later.</p>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-sm text-forest-700 hover:underline">Clear filters</button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => <RequirementCard key={r.id} r={r} />)}
          </div>
          {hasMore && (
            <div className="mt-6 text-center">
              <Button variant="secondary" onClick={() => load(false)} disabled={loading}>
                {loading ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
