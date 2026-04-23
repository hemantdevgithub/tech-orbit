import { describe, expect, it } from "vitest";
import {
  computeMatchSignal,
  MATCH_WEIGHTS,
  type MatchCandidateInput,
  type MatchRequirementInput,
} from "../../src/services/matching-engine.js";

function buildReq(
  overrides: Partial<MatchRequirementInput> = {},
): MatchRequirementInput {
  return {
    techStack: ["React", "TypeScript"],
    seniority: "SENIOR",
    locationType: "REMOTE",
    locationCity: null,
    workAuthPrefs: ["US_CITIZEN"],
    ...overrides,
  };
}

function buildCand(
  overrides: Partial<MatchCandidateInput> = {},
): MatchCandidateInput {
  return {
    skills: ["React", "TypeScript", "Node"],
    seniority: "SENIOR",
    location: "Remote",
    preferRemote: true,
    preferHybrid: false,
    preferOnsite: false,
    workAuthStatus: "US_CITIZEN",
    averageRating: 4.5,
    ...overrides,
  };
}

describe("computeMatchSignal — skill overlap", () => {
  it("100% skill overlap gives full skill score", () => {
    const sig = computeMatchSignal(
      buildReq({ techStack: ["React", "TypeScript"] }),
      buildCand({ skills: ["React", "TypeScript"] }),
    );
    expect(sig.skillOverlap).toBe(2);
  });

  it("partial overlap scales proportionally", () => {
    const sig = computeMatchSignal(
      buildReq({ techStack: ["React", "TypeScript", "Go", "Python"] }),
      buildCand({ skills: ["React", "TypeScript"] }),
    );
    expect(sig.skillOverlap).toBe(2);
    // 2/4 * 40 = 20
  });

  it("is case-insensitive", () => {
    const sig = computeMatchSignal(
      buildReq({ techStack: ["react", "TYPESCRIPT"] }),
      buildCand({ skills: ["React", "typescript"] }),
    );
    expect(sig.skillOverlap).toBe(2);
  });

  it("zero required skills produces 0 skill score (no divide-by-zero)", () => {
    const sig = computeMatchSignal(
      buildReq({ techStack: [] }),
      buildCand({ skills: ["React"] }),
    );
    expect(sig.skillOverlap).toBe(0);
    // Engine should not crash, just score 0 for skills
    expect(Number.isFinite(sig.matchScore)).toBe(true);
  });
});

describe("computeMatchSignal — seniority", () => {
  it("exact seniority match", () => {
    const sig = computeMatchSignal(
      buildReq({ seniority: "SENIOR" }),
      buildCand({ seniority: "SENIOR" }),
    );
    expect(sig.seniorityMatch).toBe(true);
  });

  it("adjacent seniority (±1) is a partial credit, not a match", () => {
    const sig = computeMatchSignal(
      buildReq({ seniority: "SENIOR" }),
      buildCand({ seniority: "MID" }),
    );
    expect(sig.seniorityMatch).toBe(false);
  });

  it("null candidate seniority scores zero", () => {
    const sig = computeMatchSignal(
      buildReq({ seniority: "SENIOR" }),
      buildCand({ seniority: null }),
    );
    expect(sig.seniorityMatch).toBe(false);
  });
});

describe("computeMatchSignal — location", () => {
  it("REMOTE requirement + candidate.preferRemote → match", () => {
    const sig = computeMatchSignal(
      buildReq({ locationType: "REMOTE" }),
      buildCand({ preferRemote: true }),
    );
    expect(sig.locationMatch).toBe(true);
  });

  it("REMOTE requirement + candidate NOT preferRemote → no match", () => {
    const sig = computeMatchSignal(
      buildReq({ locationType: "REMOTE" }),
      buildCand({ preferRemote: false }),
    );
    expect(sig.locationMatch).toBe(false);
  });

  it("ONSITE requirement + candidate preferOnsite + matching city → match", () => {
    const sig = computeMatchSignal(
      buildReq({ locationType: "ONSITE", locationCity: "Austin" }),
      buildCand({ preferOnsite: true, preferRemote: false, location: "Austin, TX" }),
    );
    expect(sig.locationMatch).toBe(true);
  });

  it("ONSITE requirement with mismatched city → no match", () => {
    const sig = computeMatchSignal(
      buildReq({ locationType: "ONSITE", locationCity: "Austin" }),
      buildCand({ preferOnsite: true, preferRemote: false, location: "Seattle" }),
    );
    expect(sig.locationMatch).toBe(false);
  });

  it("HYBRID requirement + candidate preferHybrid → match", () => {
    const sig = computeMatchSignal(
      buildReq({ locationType: "HYBRID" }),
      buildCand({ preferHybrid: true, preferRemote: false }),
    );
    expect(sig.locationMatch).toBe(true);
  });
});

describe("computeMatchSignal — work auth", () => {
  it("candidate auth in req.workAuthPrefs → match", () => {
    const sig = computeMatchSignal(
      buildReq({ workAuthPrefs: ["US_CITIZEN", "GREEN_CARD"] }),
      buildCand({ workAuthStatus: "US_CITIZEN" }),
    );
    expect(sig.workAuthMatch).toBe(true);
  });

  it("candidate auth not in prefs → no match", () => {
    const sig = computeMatchSignal(
      buildReq({ workAuthPrefs: ["US_CITIZEN"] }),
      buildCand({ workAuthStatus: "H1B" }),
    );
    expect(sig.workAuthMatch).toBe(false);
  });

  it("empty prefs = open to any (matches anyone)", () => {
    const sig = computeMatchSignal(
      buildReq({ workAuthPrefs: [] }),
      buildCand({ workAuthStatus: "H1B" }),
    );
    expect(sig.workAuthMatch).toBe(true);
  });

  it("null candidate workAuthStatus + non-empty prefs → no match", () => {
    const sig = computeMatchSignal(
      buildReq({ workAuthPrefs: ["US_CITIZEN"] }),
      buildCand({ workAuthStatus: null }),
    );
    expect(sig.workAuthMatch).toBe(false);
  });
});

describe("computeMatchSignal — rating", () => {
  it("null rating scores 0", () => {
    const sig = computeMatchSignal(
      buildReq(),
      buildCand({ averageRating: null }),
    );
    expect(sig.candidateRating).toBe(0);
  });

  it("5-star rating contributes full rating weight", () => {
    const sig = computeMatchSignal(
      buildReq({ techStack: [] }), // kill skill score
      buildCand({
        skills: [],
        seniority: null,
        preferRemote: false,
        workAuthStatus: null,
        averageRating: 5,
      }),
    );
    // Only rating contributes
    expect(sig.matchScore).toBe(MATCH_WEIGHTS.ratingMax);
  });
});

describe("computeMatchSignal — total score", () => {
  it("perfect candidate maxes out at 100", () => {
    const sig = computeMatchSignal(
      buildReq({
        techStack: ["React", "TypeScript"],
        seniority: "SENIOR",
        locationType: "REMOTE",
        workAuthPrefs: ["US_CITIZEN"],
      }),
      buildCand({
        skills: ["React", "TypeScript"],
        seniority: "SENIOR",
        preferRemote: true,
        workAuthStatus: "US_CITIZEN",
        averageRating: 5,
      }),
    );
    // 40 + 20 + 15 + 15 + 10 = 100
    expect(sig.matchScore).toBe(100);
  });

  it("terrible candidate scores near zero", () => {
    const sig = computeMatchSignal(
      buildReq({
        techStack: ["Go"],
        seniority: "PRINCIPAL",
        locationType: "ONSITE",
        locationCity: "NYC",
        workAuthPrefs: ["US_CITIZEN"],
      }),
      buildCand({
        skills: ["PHP"],
        seniority: "JUNIOR",
        preferRemote: true,
        preferHybrid: false,
        preferOnsite: false,
        workAuthStatus: "OPT",
        averageRating: null,
      }),
    );
    expect(sig.matchScore).toBe(0);
  });

  it("score is always an integer in [0, 100]", () => {
    const sig = computeMatchSignal(
      buildReq(),
      buildCand({ averageRating: 3.7 }),
    );
    expect(Number.isInteger(sig.matchScore)).toBe(true);
    expect(sig.matchScore).toBeGreaterThanOrEqual(0);
    expect(sig.matchScore).toBeLessThanOrEqual(100);
  });
});
