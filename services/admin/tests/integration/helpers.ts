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
  await db.disputeNote.deleteMany();
  await db.dispute.deleteMany();
  await db.roleApplication.deleteMany();
  await db.auditLog.deleteMany();
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
  admin: "aaaaaaaa-1111-1111-1111-111111111111",
  candidate: "cccccccc-1111-1111-1111-111111111111",
  stranger: "ffffffff-1111-1111-1111-111111111111",
  customer: "bbbbbbbb-1111-1111-1111-111111111111",
};

// Stub identity-svc endpoints that admin-svc calls:
//   - POST /api/v1/internal/users/:id/roles
//   - POST /api/v1/internal/users/:id/roles/activate
//   - POST /api/v1/internal/users/:id/status
//   - POST /api/v1/internal/users/:id/trigger-password-reset
//   - GET  /api/v1/internal/users/search?q=
export type IdentityStubCalls = {
  addRole: Array<{ userId: string; roleType: string }>;
  activateRole: Array<{ userId: string; roleType: string }>;
  status: Array<{ userId: string; body: Record<string, unknown> }>;
  passwordReset: Array<{ userId: string }>;
  search: Array<{ q: string }>;
};

export function stubIdentityFetch(opts: {
  searchResult?: Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    status: string;
    roles: string[];
    createdAt: string;
  }>;
}): { calls: IdentityStubCalls; spy: ReturnType<typeof vi.spyOn> } {
  const calls: IdentityStubCalls = { addRole: [], activateRole: [], status: [], passwordReset: [], search: [] };

  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();

    const activateRole = url.match(/\/api\/v1\/internal\/users\/([0-9a-f-]+)\/roles\/activate$/i);
    if (activateRole) {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      calls.activateRole.push({ userId: activateRole[1]!, roleType: body.roleType });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    const addRole = url.match(/\/api\/v1\/internal\/users\/([0-9a-f-]+)\/roles$/i);
    if (addRole) {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      calls.addRole.push({ userId: addRole[1]!, roleType: body.roleType });
      return new Response(JSON.stringify({ ok: true }), { status: 201 });
    }

    const status = url.match(/\/api\/v1\/internal\/users\/([0-9a-f-]+)\/status$/i);
    if (status) {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      calls.status.push({ userId: status[1]!, body });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    const reset = url.match(/\/api\/v1\/internal\/users\/([0-9a-f-]+)\/trigger-password-reset$/i);
    if (reset) {
      calls.passwordReset.push({ userId: reset[1]! });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    if (url.includes("/api/v1/internal/users/search")) {
      const q = new URL(url).searchParams.get("q") ?? "";
      calls.search.push({ q });
      return new Response(JSON.stringify({ data: opts.searchResult ?? [] }), { status: 200 });
    }

    if (url.includes("/api/v1/internal/metrics/")) {
      return new Response(JSON.stringify({ value: 0 }), { status: 200 });
    }

    return new Response("not found", { status: 404 });
  });

  return { calls, spy };
}
