import type { FastifyInstance } from "fastify";
import { describe, vi } from "vitest";
import type { InterviewSummary } from "@techorbit/types";
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
  await prisma.msmeBenchEntry.deleteMany();
  await prisma.candidateProfile.deleteMany();
  await prisma.msmeProfile.deleteMany();
  await prisma.customerCompanyProfile.deleteMany();
  await prisma.interviewerProfile.deleteMany();
}

import { createPrivateKey } from "node:crypto";
import { SignJWT } from "jose";

export type StubInterviewSummary = InterviewSummary & { candidateId?: string };

// Stub the interview-svc summaries endpoint used by profile-svc when
// resolving a candidate's featured interviews. Pass in a list of
// summaries (with candidateId hints); the stub respects the ids and
// candidateId filter applied by the caller.
export function stubInterviewSummaries(
  summaries: StubInterviewSummary[] = [],
): ReturnType<typeof vi.spyOn> {
  const summaryMap = new Map<string, StubInterviewSummary>();
  for (const s of summaries) summaryMap.set(s.id, s);

  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : input.toString();

    const match = url.match(/\/api\/v1\/internal\/interviews\/summaries\?(.+)$/);
    if (!match) return new Response("not stubbed", { status: 501 });

    const params = new URLSearchParams(match[1]);
    const ids = (params.get("ids") ?? "").split(",").filter(Boolean);
    const candidateId = params.get("candidateId") ?? undefined;

    const data = ids
      .map((id) => summaryMap.get(id))
      .filter((s): s is StubInterviewSummary => s !== undefined)
      .filter((s) => !candidateId || s.candidateId === candidateId)
      .map(({ candidateId: _c, ...rest }) => rest);

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
}

// Sign a test JWT using the RSA private key generated in globalSetup
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
