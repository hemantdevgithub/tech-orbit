/**
 * Shared helpers for identity-svc integration tests.
 *
 * - `runIntegrationSuite` wraps `describe` with a docker-availability guard.
 *   When DOCKER_AVAILABLE!=1 (set by globalSetup), the suite skips instead of
 *   failing, so `pnpm test` stays green without a running Docker daemon.
 *
 * - `getServer` builds the Fastify server once per file and caches it.
 *
 * - `resetDb` truncates every table on the identity schema between tests.
 */
import type { FastifyInstance } from "fastify";
import { describe } from "vitest";
import { PrismaClient } from "../../src/generated/client/index.js";

let serverInstance: FastifyInstance | undefined;
let prismaInstance: PrismaClient | undefined;

export function dockerAvailable(): boolean {
  return process.env.DOCKER_AVAILABLE === "1";
}

type DescribeFn = typeof describe;

/**
 * Wrap a describe block so it skips cleanly when Docker isn't available.
 * Use at the top of every integration test file.
 */
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

/**
 * Delete every row in the identity tables. Order matters for FK cascade;
 * the User table also has ON DELETE CASCADE for Sessions / Roles / 2FA /
 * PasswordResets, so deleting users is enough for those. OutgoingEvent
 * has no FK and must be truncated explicitly.
 */
export async function resetDb(): Promise<void> {
  const prisma = getPrisma();
  await prisma.$transaction([
    prisma.outgoingEvent.deleteMany(),
    prisma.passwordResetRequest.deleteMany(),
    prisma.twoFAChallenge.deleteMany(),
    prisma.session.deleteMany(),
    prisma.userRole.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

/**
 * Strong, zxcvbn-acceptable password that every test can share.
 */
export const TEST_PASSWORD = "Z7!mvq$HeronLatch92";

/**
 * Extract the `refresh_token` value from a Set-Cookie list or Fastify cookies array.
 */
export function extractRefreshCookie(
  cookies: Array<{ name: string; value: string }> | undefined
): string | undefined {
  return cookies?.find((c) => c.name === "refresh_token")?.value;
}

/**
 * Build a Cookie header value from a refresh token string.
 */
export function cookieHeader(refreshToken: string): string {
  return `refresh_token=${refreshToken}`;
}
