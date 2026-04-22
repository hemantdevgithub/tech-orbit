import type { FastifyInstance } from "fastify";
import { describe } from "vitest";
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
