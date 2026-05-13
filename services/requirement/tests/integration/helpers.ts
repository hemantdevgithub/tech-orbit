import type { FastifyInstance } from "fastify";
import { describe, vi } from "vitest";
import { PrismaClient } from "../../src/generated/client/index.js";
import { createPrivateKey } from "node:crypto";
import { SignJWT } from "jose";

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
  await prisma.crmAttributionRequest.deleteMany();
  await prisma.requirement.deleteMany();
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

// Stub the profile-svc HTTP call made during createRequirement.
// Pass `attributedCrmUserId` to simulate a customer who already has a CRM
// linked (triggers the auto-attribute branch).
export function stubProfileCustomer(opts: {
  id?: string;           // CustomerCompanyProfile.id; defaults to a deterministic UUID
  primaryUserId: string;
  attributedCrmUserId?: string | null;
  isProfileComplete?: boolean;
}): ReturnType<typeof vi.spyOn> {
  // Default company id: replace leading bytes of primaryUserId with "cc" prefix
  // to make it a distinct but readable UUID in test output.
  const companyId = opts.id ?? opts.primaryUserId.replace(/^.{8}/, "cccccccc");
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/api/v1/customers/")) {
      return new Response(
        JSON.stringify({
          id: companyId,
          primaryUserId: opts.primaryUserId,
          attributedCrmUserId: opts.attributedCrmUserId ?? null,
          isProfileComplete: opts.isProfileComplete ?? true,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return new Response("not found", { status: 404 });
  });
}

// Minimal valid CreateRequirement payload — tests override specific fields.
// Note: customerCompanyId is NOT in the payload; it is derived server-side
// from the caller's CustomerCompanyProfile.id (Sprint 3.5 semantic fix).
export function buildRequirementPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: "Senior Java Developer",
    description: "Build and scale our payments platform. Java, Spring, AWS.",
    techStack: ["Java", "AWS"],
    seniority: "SENIOR",
    locationType: "REMOTE",
    billRateMinUsd: 80,
    billRateMaxUsd: 120,
    durationWeeks: 12,
    startDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    openings: 2,
    workAuthPrefs: ["US_CITIZEN", "GREEN_CARD"],
    requiredInterviews: 2,
    blindPosting: false,
    ...overrides,
  };
}
