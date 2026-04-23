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
  if (!dockerAvailable()) return describe.skip(...args);
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
  if (!prismaInstance) prismaInstance = new PrismaClient();
  return prismaInstance;
}

export async function closeServer(): Promise<void> {
  if (serverInstance) { await serverInstance.close(); serverInstance = undefined; }
  if (prismaInstance) { await prismaInstance.$disconnect(); prismaInstance = undefined; }
}

export async function resetDb(): Promise<void> {
  const db = getPrisma();
  await db.outgoingEvent.deleteMany();
  await db.commissionRule.deleteMany();
  await db.valueChain.deleteMany();
  await db.placement.deleteMany();
}

export async function makeBearerToken(
  userId: string,
  roles: string[] = [],
  sessionId = "00000000-0000-0000-0000-000000000001",
): Promise<string> {
  const pem = process.env.JWT_PRIVATE_KEY_TEST;
  if (!pem) throw new Error("JWT_PRIVATE_KEY_TEST not set");
  const privateKey = createPrivateKey(pem);
  return new SignJWT({ sub: userId, sessionId, roles })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(privateKey);
}

// ─── Cross-service fetch stubs ─────────────────────────────────────────────────
//
// Placement-svc calls matching, requirement, and interview services during
// createPlacement.  We route all of those to the same plan.

export type StubSubmission = {
  id: string;
  requirementId: string;
  candidateId: string;
  submittedByUserId: string;
  submitterRole: string;
  attributedSrmId: string | null;
  attributedMsmeId: string | null;
  status: string;
  matchScore: number | null;
};

export type StubRequirement = {
  id: string;
  customerCompanyId: string;
  createdByUserId: string;
  attributedCrmId: string | null;
  title: string;
  status: string;
  locationType: string;
};

export type StubInterview = {
  id: string;
  submissionId: string;
  candidateId: string;
  interviewerUserId: string | null;
  status: string;
  interviewerFeeUsd: number | null;
};

export type StubPlan = {
  submissions: StubSubmission[];
  requirements: StubRequirement[];
  interviews: StubInterview[];
};

export function stubCrossServiceFetch(plan: StubPlan): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : input.toString();

    // /api/v1/internal/submissions/:id
    const subMatch = url.match(/\/api\/v1\/internal\/submissions\/([0-9a-f-]+)/i);
    if (subMatch) {
      const sub = plan.submissions.find((s) => s.id === subMatch[1]);
      if (!sub) return new Response("not found", { status: 404 });
      return new Response(JSON.stringify(sub), { status: 200 });
    }

    // /api/v1/internal/requirements/:id
    const reqMatch = url.match(/\/api\/v1\/internal\/requirements\/([0-9a-f-]+)/i);
    if (reqMatch) {
      const req = plan.requirements.find((r) => r.id === reqMatch[1]);
      if (!req) return new Response("not found", { status: 404 });
      return new Response(JSON.stringify(req), { status: 200 });
    }

    // /api/v1/internal/interviews?submissionId=...
    if (url.includes("/api/v1/internal/interviews")) {
      const params = new URL(url, "http://x").searchParams;
      const submissionId = params.get("submissionId");
      const status = params.get("status");
      const ivs = plan.interviews.filter(
        (iv) => iv.submissionId === submissionId && (!status || iv.status === status),
      );
      return new Response(JSON.stringify({ data: ivs }), { status: 200 });
    }

    return new Response("not found", { status: 404 });
  });
}

// Factory builders.  Keep test bodies short.

const CUSTOMER_USER = "aaaaaaaa-1111-1111-1111-111111111111";
const COMPANY      = "cccccccc-9999-9999-9999-999999999999";
const SUB_ID       = "dddddddd-1111-1111-1111-111111111111";
const REQ_ID       = "eeeeeeee-1111-1111-1111-111111111111";

export const IDS = {
  customerUser: CUSTOMER_USER,
  company: COMPANY,
  submission: SUB_ID,
  requirement: REQ_ID,
  candidate: "cccccccc-1111-1111-1111-111111111111",
  crm:        "aaaaaaaa-2222-2222-2222-222222222222",
  srm:        "aaaaaaaa-3333-3333-3333-333333333333",
  msme:       "aaaaaaaa-4444-4444-4444-444444444444",
  interviewer1: "bbbbbbbb-1111-1111-1111-111111111111",
  interviewer2: "bbbbbbbb-2222-2222-2222-222222222222",
};

export function buildSubmission(overrides: Partial<StubSubmission> = {}): StubSubmission {
  return {
    id: IDS.submission,
    requirementId: IDS.requirement,
    candidateId: IDS.candidate,
    submittedByUserId: IDS.candidate,
    submitterRole: "CANDIDATE_SELF",
    attributedSrmId: null,
    attributedMsmeId: null,
    status: "OFFER",
    matchScore: 85,
    ...overrides,
  };
}

export function buildRequirement(overrides: Partial<StubRequirement> = {}): StubRequirement {
  return {
    id: IDS.requirement,
    customerCompanyId: IDS.company,
    createdByUserId: IDS.customerUser,
    attributedCrmId: null,
    title: "Senior React Dev",
    status: "OPEN",
    locationType: "REMOTE",
    ...overrides,
  };
}

export function buildInterview(overrides: Partial<StubInterview> = {}): StubInterview {
  return {
    id: "f" + crypto.randomUUID().slice(1),
    submissionId: IDS.submission,
    candidateId: IDS.candidate,
    interviewerUserId: IDS.interviewer1,
    status: "COMPLETED",
    interviewerFeeUsd: 150,
    ...overrides,
  };
}

export function defaultPlacementBody(overrides: Record<string, unknown> = {}) {
  return {
    submissionId: IDS.submission,
    engagementType: "W2",
    billRateUsd: 120,
    payRateUsd: 90,
    startDate: new Date(Date.now() + 14 * 86400_000).toISOString(),
    endDate: new Date(Date.now() + 100 * 86400_000).toISOString(),
    ...overrides,
  };
}
