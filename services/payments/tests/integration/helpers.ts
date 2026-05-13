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
  await db.commissionPayout.deleteMany();
  await db.invoiceLineItem.deleteMany();
  await db.invoice.deleteMany();
  await db.timesheet.deleteMany();
  await db.processedEvent.deleteMany();
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

// ─── Cross-service stubs ──────────────────────────────────────────────────────

export type StubPlacement = {
  id: string;
  requirementId: string;
  submissionId: string;
  candidateId: string;
  customerCompanyId: string;
  createdByUserId: string;
  engagementType: "W2" | "C2C" | "IC_1099";
  billRateUsd: number;
  payRateUsd: number | null;
  startDate: string;
  endDate: string;
  status: string;
};

export type StubRule = {
  id: string;
  placementId: string;
  slot: string;
  calculation: string;
  percentOfBillRate: number | null;
  flatFeeUsd: number | null;
  beneficiaryUserId: string | null;
  beneficiaryMsmeId: string | null;
  interviewId: string | null;
};

export type StubPlan = {
  placements: StubPlacement[];
  commissionRules: StubRule[];
  customerPrimaryUsers?: Array<{ primaryUserId: string; id: string }>;
};

export function stubCrossServiceFetch(plan: StubPlan): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : input.toString();

    // /api/v1/internal/placements/:id (must come before list match)
    const idMatch = url.match(/\/api\/v1\/internal\/placements\/([0-9a-f-]+)$/i);
    if (idMatch) {
      const p = plan.placements.find((x) => x.id === idMatch[1]);
      if (!p) return new Response("not found", { status: 404 });
      return new Response(JSON.stringify(p), { status: 200 });
    }

    // /api/v1/internal/placements/:id/commissions
    const commMatch = url.match(/\/api\/v1\/internal\/placements\/([0-9a-f-]+)\/commissions/i);
    if (commMatch) {
      const rules = plan.commissionRules.filter((r) => r.placementId === commMatch[1]);
      return new Response(JSON.stringify({ data: rules }), { status: 200 });
    }

    // /api/v1/internal/placements?status=ACTIVE&...
    if (url.includes("/api/v1/internal/placements")) {
      const active = plan.placements.filter((p) => p.status === "ACTIVE");
      return new Response(
        JSON.stringify({ data: active, nextCursor: null, hasMore: false }),
        { status: 200 },
      );
    }

    // /api/v1/internal/customers/:userId
    const custMatch = url.match(/\/api\/v1\/internal\/customers\/([0-9a-f-]+)/i);
    if (custMatch) {
      const u = (plan.customerPrimaryUsers ?? []).find((c) => c.primaryUserId === custMatch[1]);
      if (!u) return new Response("not found", { status: 404 });
      return new Response(JSON.stringify(u), { status: 200 });
    }

    return new Response("not found", { status: 404 });
  });
}

export const IDS = {
  customer: "aaaaaaaa-1111-1111-1111-111111111111",
  candidate: "cccccccc-1111-1111-1111-111111111111",
  crm: "bbbbbbbb-1111-1111-1111-111111111111",
  srm: "bbbbbbbb-2222-2222-2222-222222222222",
  company: "eeeeeeee-1111-1111-1111-111111111111",
  placement: "dddddddd-1111-1111-1111-111111111111",
  requirement: "dddddddd-2222-2222-2222-222222222222",
  submission: "dddddddd-3333-3333-3333-333333333333",
  interviewer: "ffffffff-1111-1111-1111-111111111111",
};

export function buildPlacement(overrides: Partial<StubPlacement> = {}): StubPlacement {
  return {
    id: IDS.placement,
    requirementId: IDS.requirement,
    submissionId: IDS.submission,
    candidateId: IDS.candidate,
    customerCompanyId: IDS.company,
    createdByUserId: IDS.customer,
    engagementType: "W2",
    billRateUsd: 120,
    payRateUsd: 90,
    startDate: new Date(Date.now() - 30 * 86400_000).toISOString(),
    endDate: new Date(Date.now() + 180 * 86400_000).toISOString(),
    status: "ACTIVE",
    ...overrides,
  };
}

export function fullW2Rules(placementId: string, opts?: { withCrm?: boolean; withSrm?: boolean; withInterviewer?: boolean }) {
  const rules: StubRule[] = [];
  if (opts?.withCrm !== false) {
    rules.push({
      id: "r-crm-" + placementId.slice(0, 4),
      placementId, slot: "CRM", calculation: "PERCENT_OF_BILL",
      percentOfBillRate: 0.08, flatFeeUsd: null,
      beneficiaryUserId: IDS.crm, beneficiaryMsmeId: null, interviewId: null,
    });
  }
  if (opts?.withSrm !== false) {
    rules.push({
      id: "r-srm-" + placementId.slice(0, 4),
      placementId, slot: "SRM", calculation: "PERCENT_OF_BILL",
      percentOfBillRate: 0.05, flatFeeUsd: null,
      beneficiaryUserId: IDS.srm, beneficiaryMsmeId: null, interviewId: null,
    });
  }
  rules.push({
    id: "r-cand-" + placementId.slice(0, 4),
    placementId, slot: "CANDIDATE_W2", calculation: "PERCENT_OF_BILL",
    percentOfBillRate: 0.75, flatFeeUsd: null,
    beneficiaryUserId: IDS.candidate, beneficiaryMsmeId: null, interviewId: null,
  });
  rules.push({
    id: "r-plat-" + placementId.slice(0, 4),
    placementId, slot: "PLATFORM", calculation: "RESIDUAL",
    percentOfBillRate: null, flatFeeUsd: null,
    beneficiaryUserId: null, beneficiaryMsmeId: null, interviewId: null,
  });
  if (opts?.withInterviewer) {
    rules.push({
      id: "r-int-" + placementId.slice(0, 4),
      placementId, slot: "INTERVIEWER", calculation: "FLAT_FEE",
      percentOfBillRate: null, flatFeeUsd: 150,
      beneficiaryUserId: IDS.interviewer, beneficiaryMsmeId: null, interviewId: "iv-1",
    });
  }
  return rules;
}

// Helper to create a DB timesheet directly (bypassing service) for tests
// that need APPROVED rows in the window.
export async function insertApprovedTimesheet(opts: {
  placementId: string;
  candidateId: string;
  weekStartDate: Date;
  hours: number;
  approverUserId: string;
}): Promise<string> {
  const db = getPrisma();
  const weekEnd = new Date(opts.weekStartDate);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);
  const row = await db.timesheet.create({
    data: {
      placementId: opts.placementId,
      candidateId: opts.candidateId,
      weekStartDate: opts.weekStartDate,
      weekEndDate: weekEnd,
      hoursWorked: opts.hours,
      status: "APPROVED",
      submittedAt: new Date(),
      approvedAt: new Date(),
      approvedBy: opts.approverUserId,
    },
  });
  return row.id;
}
