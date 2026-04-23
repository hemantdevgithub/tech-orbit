import type { LocationType, Seniority, WorkAuthStatus } from "@techorbit/types";

// Pure, dependency-free scoring. Callers adapt Prisma types / API responses
// to these input shapes; the engine itself never reaches out to the DB or HTTP.

export type MatchRequirementInput = {
  techStack: string[];
  seniority: Seniority;
  locationType: LocationType;
  locationCity: string | null;
  workAuthPrefs: WorkAuthStatus[];
};

export type MatchCandidateInput = {
  skills: string[];
  seniority: Seniority | null;
  location: string | null;
  preferRemote: boolean;
  preferHybrid: boolean;
  preferOnsite: boolean;
  workAuthStatus: string | null;
  averageRating: number | null; // 0–5, null for new candidates
};

export type MatchSignal = {
  skillOverlap: number;
  seniorityMatch: boolean;
  locationMatch: boolean;
  workAuthMatch: boolean;
  candidateRating: number; // normalized to 0 if null
  matchScore: number; // 0–100
};

// Score weights — intentionally extracted so we can tune without
// rewriting the algorithm. Totals to 100.
export const MATCH_WEIGHTS = {
  skills: 40,
  seniorityExact: 20,
  seniorityAdjacent: 10,
  locationExact: 15,
  locationHybrid: 10,
  workAuth: 15,
  ratingMax: 10,
} as const;

const SENIORITY_ORDER: ReadonlyArray<Seniority> = [
  "JUNIOR",
  "MID",
  "SENIOR",
  "STAFF",
  "PRINCIPAL",
  "PARTNER",
];

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function skillOverlapCount(required: string[], candidate: string[]): number {
  if (required.length === 0) return 0;
  const candidateSet = new Set(candidate.map(normalize));
  let hits = 0;
  for (const req of required) {
    if (candidateSet.has(normalize(req))) hits += 1;
  }
  return hits;
}

function seniorityScore(
  req: Seniority,
  cand: Seniority | null,
): { score: number; match: boolean } {
  if (cand === null) return { score: 0, match: false };
  const reqIdx = SENIORITY_ORDER.indexOf(req);
  const candIdx = SENIORITY_ORDER.indexOf(cand);
  if (reqIdx < 0 || candIdx < 0) return { score: 0, match: false };
  const diff = Math.abs(reqIdx - candIdx);
  if (diff === 0) return { score: MATCH_WEIGHTS.seniorityExact, match: true };
  if (diff === 1) return { score: MATCH_WEIGHTS.seniorityAdjacent, match: false };
  return { score: 0, match: false };
}

function locationScore(
  req: MatchRequirementInput,
  cand: MatchCandidateInput,
): { score: number; match: boolean } {
  if (req.locationType === "REMOTE") {
    return cand.preferRemote
      ? { score: MATCH_WEIGHTS.locationExact, match: true }
      : { score: 0, match: false };
  }
  if (req.locationType === "HYBRID") {
    return cand.preferHybrid
      ? { score: MATCH_WEIGHTS.locationHybrid, match: true }
      : { score: 0, match: false };
  }
  // ONSITE — require explicit onsite preference AND a loose city match
  // (candidate.location is free text, so we substring-match on either side).
  if (!cand.preferOnsite) return { score: 0, match: false };
  if (!req.locationCity || !cand.location) return { score: 0, match: false };
  const reqCity = normalize(req.locationCity);
  const candLoc = normalize(cand.location);
  if (candLoc.includes(reqCity) || reqCity.includes(candLoc)) {
    return { score: MATCH_WEIGHTS.locationExact, match: true };
  }
  return { score: 0, match: false };
}

function workAuthScore(
  req: MatchRequirementInput,
  cand: MatchCandidateInput,
): { score: number; match: boolean } {
  // If the requirement lists no preferences, treat as open — match.
  if (req.workAuthPrefs.length === 0) {
    return { score: MATCH_WEIGHTS.workAuth, match: true };
  }
  if (!cand.workAuthStatus) return { score: 0, match: false };
  const list = req.workAuthPrefs.map((s) => String(s));
  if (list.includes(cand.workAuthStatus)) {
    return { score: MATCH_WEIGHTS.workAuth, match: true };
  }
  return { score: 0, match: false };
}

function ratingScore(averageRating: number | null): number {
  if (averageRating === null) return 0;
  const clamped = Math.max(0, Math.min(5, averageRating));
  return (clamped / 5) * MATCH_WEIGHTS.ratingMax;
}

export function computeMatchSignal(
  requirement: MatchRequirementInput,
  candidate: MatchCandidateInput,
): MatchSignal {
  const overlap = skillOverlapCount(requirement.techStack, candidate.skills);
  const skillScore =
    requirement.techStack.length === 0
      ? 0
      : Math.min(
          MATCH_WEIGHTS.skills,
          (overlap / requirement.techStack.length) * MATCH_WEIGHTS.skills,
        );

  const sen = seniorityScore(requirement.seniority, candidate.seniority);
  const loc = locationScore(requirement, candidate);
  const auth = workAuthScore(requirement, candidate);
  const rating = ratingScore(candidate.averageRating);

  const total = skillScore + sen.score + loc.score + auth.score + rating;

  return {
    skillOverlap: overlap,
    seniorityMatch: sen.match,
    locationMatch: loc.match,
    workAuthMatch: auth.match,
    candidateRating: candidate.averageRating ?? 0,
    matchScore: Math.round(Math.max(0, Math.min(100, total))),
  };
}
