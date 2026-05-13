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
  await db.scorecard.deleteMany();
  await db.interview.deleteMany();
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

export type StubSubmission = {
  id: string;
  requirementId: string;
  candidateId: string;
  submittedByUserId: string;
  status: string;
  matchScore: number | null;
};

export type StubInterviewer = {
  id: string;
  userId: string;
  displayName: string;
  specializations: string[];
  isVerified: boolean;
};

export type StubPlan = {
  submissions: StubSubmission[];
  interviewers: StubInterviewer[];
};

export function stubCrossServiceFetch(plan: StubPlan): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : input.toString();

    // Internal submission lookup
    const subMatch = url.match(/\/api\/v1\/internal\/submissions\/([0-9a-f-]+)/i);
    if (subMatch) {
      const sub = plan.submissions.find((s) => s.id === subMatch[1]);
      if (!sub) return new Response("not found", { status: 404 });
      return new Response(JSON.stringify(sub), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }

    // Interviewer lookup
    const ivMatch = url.match(/\/api\/v1\/interviewers\/([0-9a-f-]+)/i);
    if (ivMatch) {
      const iv = plan.interviewers.find((i) => i.userId === ivMatch[1]);
      if (!iv) return new Response("not found", { status: 404 });
      return new Response(JSON.stringify(iv), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }

    return new Response("not found", { status: 404 });
  });
}

export function buildSubmission(overrides: Partial<StubSubmission> = {}): StubSubmission {
  return {
    id: "dddddddd-1111-1111-1111-111111111111",
    requirementId: "eeeeeeee-1111-1111-1111-111111111111",
    candidateId: "cccccccc-1111-1111-1111-111111111111",
    submittedByUserId: "cccccccc-1111-1111-1111-111111111111",
    status: "SCREENING",
    matchScore: 85,
    ...overrides,
  };
}
