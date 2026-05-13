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
  await db.message.deleteMany();
  await db.thread.deleteMany();
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

export const IDS = {
  customer: "aaaaaaaa-1111-1111-1111-111111111111",
  candidate: "cccccccc-1111-1111-1111-111111111111",
  stranger: "ffffffff-1111-1111-1111-111111111111",
  srm: "bbbbbbbb-2222-2222-2222-222222222222",
  placement: "dddddddd-1111-1111-1111-111111111111",
  requirement: "dddddddd-2222-2222-2222-222222222222",
};

// Cross-service stub: messaging participant-resolver hits placement/requirement/
// matching/interview internal endpoints. Provide one stub for the subset used.
export type StubPlan = {
  placement?: { id: string; candidateId: string; createdByUserId: string; status: string };
  requirement?: { id: string; createdByUserId: string };
};

export function stubCrossServiceFetch(plan: StubPlan): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : input.toString();

    const placementMatch = url.match(/\/api\/v1\/internal\/placements\/([0-9a-f-]+)$/i);
    if (placementMatch && plan.placement && plan.placement.id === placementMatch[1]) {
      return new Response(JSON.stringify(plan.placement), { status: 200 });
    }

    const reqMatch = url.match(/\/api\/v1\/internal\/requirements\/([0-9a-f-]+)$/i);
    if (reqMatch && plan.requirement && plan.requirement.id === reqMatch[1]) {
      return new Response(JSON.stringify(plan.requirement), { status: 200 });
    }

    return new Response("not found", { status: 404 });
  });
}
