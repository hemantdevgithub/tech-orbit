import type { FastifyInstance } from "fastify";
import { describe, vi } from "vitest";
import { createPrivateKey } from "node:crypto";
import { SignJWT } from "jose";
import { PrismaClient } from "../../src/generated/client/index.js";

let serverInstance: FastifyInstance | undefined;
let prismaInstance: PrismaClient | undefined;

export function dockerAvailable(): boolean {
  return process.env.DOCKER_AVAILABLE === "1";
}

type DescribeFn = typeof describe;

export const runIntegrationSuite: DescribeFn = ((...args: Parameters<DescribeFn>) => {
  if (!dockerAvailable()) {
    return describe.skip(...args);
  }
  return describe(...args);
}) as DescribeFn;

export async function getServer(): Promise<FastifyInstance> {
  if (!serverInstance) {
    const { buildServer } = await import("../../src/server.js");
    serverInstance = await buildServer();
    await serverInstance.ready();
  }
  return serverInstance;
}

export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

export async function closeServer(): Promise<void> {
  if (serverInstance) {
    await serverInstance.close();
    serverInstance = undefined;
  }
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = undefined;
  }
}

export async function resetDb(): Promise<void> {
  const prisma = getPrisma();
  await prisma.outgoingEvent.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.matchingSignal.deleteMany();
  await prisma.processedEvent.deleteMany();
}

export async function makeBearerToken(
  userId: string,
  roles: string[] = [],
  sessionId = "00000000-0000-0000-0000-000000000001",
): Promise<string> {
  const pem = process.env.JWT_PRIVATE_KEY_TEST;
  if (!pem) throw new Error("JWT_PRIVATE_KEY_TEST not set — run in integration test context");
  const privateKey = createPrivateKey(pem);
  return new SignJWT({ sub: userId, sessionId, roles })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(privateKey);
}

// ─── Stubs for cross-service HTTP calls ──────────────────────────────────────
//
// matching-svc calls:
//   - profile-svc: /api/v1/candidates/:userId (user token), /api/v1/internal/candidates (service token)
//   - requirement-svc: /api/v1/internal/requirements/:id (service token)
// All of these hit globalThis.fetch, so we install a single spy that routes
// by URL.

export type StubCandidate = {
  id: string;
  userId: string;
  seniority: string | null;
  skills: string[];
  location: string | null;
  preferRemote: boolean;
  preferHybrid: boolean;
  preferOnsite: boolean;
  workAuthStatus: string | null;
  averageRating: number | null;
  isProfileComplete: boolean;
};

export type StubRequirement = {
  id: string;
  customerCompanyId: string;
  createdByUserId: string;
  attributedCrmId: string | null;
  title?: string;
  techStack: string[];
  seniority: "JUNIOR" | "MID" | "SENIOR" | "STAFF" | "PRINCIPAL" | "PARTNER";
  locationType: "ONSITE" | "HYBRID" | "REMOTE";
  locationCity: string | null;
  workAuthPrefs: string[];
  status: string;
  blindPosting?: boolean;
  publishedAt?: string | null;
  locationState?: string | null;
};

export type StubPlan = {
  candidates: StubCandidate[];
  requirements: StubRequirement[];
};

export function stubCrossServiceFetch(plan: StubPlan): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : input.toString();

    // /api/v1/internal/candidates?cursor=&limit=
    if (url.includes("/api/v1/internal/candidates")) {
      return new Response(
        JSON.stringify({ data: plan.candidates, nextCursor: null, hasMore: false }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    // /api/v1/candidates/:userId
    const candMatch = url.match(/\/api\/v1\/candidates\/([0-9a-f-]+)/i);
    if (candMatch) {
      const userId = candMatch[1];
      const cand = plan.candidates.find((c) => c.userId === userId);
      if (!cand) return new Response("not found", { status: 404 });
      return new Response(JSON.stringify(cand), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // /api/v1/internal/requirements/:id
    const reqMatch = url.match(/\/api\/v1\/internal\/requirements\/([0-9a-f-]+)/i);
    if (reqMatch) {
      const id = reqMatch[1];
      const req = plan.requirements.find((r) => r.id === id);
      if (!req) return new Response("not found", { status: 404 });
      return new Response(
        JSON.stringify({
          ...req,
          title: req.title ?? "Test Requirement",
          description: "Test",
          billRateMinUsd: 80,
          billRateMaxUsd: 120,
          durationWeeks: 12,
          startDate: new Date().toISOString(),
          openings: 1,
          requiredInterviews: 2,
          blindPosting: req.blindPosting ?? false,
          locationState: req.locationState ?? null,
          publishedAt: req.publishedAt ?? new Date().toISOString(),
          closedAt: null,
          closedReason: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    return new Response("not found", { status: 404 });
  });
}

// Minimal candidate builder — IDs default to a deterministic shape so tests
// read cleanly.
export function buildCandidate(overrides: Partial<StubCandidate> = {}): StubCandidate {
  const userId = overrides.userId ?? "11111111-1111-1111-1111-111111111111";
  return {
    id: userId.replace(/^.{8}/, "cccccccc"),
    userId,
    seniority: "SENIOR",
    skills: ["Java", "AWS"],
    location: "Remote",
    preferRemote: true,
    preferHybrid: false,
    preferOnsite: false,
    workAuthStatus: "US_CITIZEN",
    averageRating: 4.5,
    isProfileComplete: true,
    ...overrides,
  };
}

export function buildRequirement(
  overrides: Partial<StubRequirement> = {},
): StubRequirement {
  return {
    id: "aaaaaaaa-1111-1111-1111-111111111111",
    customerCompanyId: "cccccccc-9999-9999-9999-999999999999",
    createdByUserId: "99999999-9999-9999-9999-999999999999",
    attributedCrmId: null,
    techStack: ["Java", "AWS"],
    seniority: "SENIOR",
    locationType: "REMOTE",
    locationCity: null,
    workAuthPrefs: ["US_CITIZEN", "GREEN_CARD"],
    status: "OPEN",
    ...overrides,
  };
}
