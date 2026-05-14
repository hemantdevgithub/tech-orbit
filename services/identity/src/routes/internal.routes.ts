import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireServiceRole } from "@techorbit/auth-middleware";
import { NotFoundError, ValidationError } from "@techorbit/errors";
import { userRepository } from "../repositories/user.repository.js";
import { roleService } from "../services/role.service.js";
import { passwordResetService } from "../services/password-reset.service.js";
import { prisma } from "../lib/prisma.js";
import type { UserRoleType } from "../generated/client/index.js";

const IdParams = z.object({ id: z.string().uuid() });
const AddRoleBody = z.object({
  roleType: z.enum(["CUSTOMER", "CANDIDATE", "CRM", "SRM", "MSME", "INTERVIEWER", "ADMIN"]),
});
const StatusBody = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "BANNED"]),
  reason: z.string().max(2000).optional(),
  duration: z.string().optional(),
  performedBy: z.string().uuid(),
});
const SearchQuery = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// Internal routes gated on roles=["SERVICE"]. Used by admin-svc to drive
// role grants, user status changes, password resets, and user search.
export async function internalIdentityRoutes(fastify: FastifyInstance): Promise<void> {
  const gate = requireServiceRole(fastify);
  const systemCtx = { type: "system" as const };

  // GET /api/v1/internal/users/:id — profile + roles, unfiltered
  fastify.get(
    "/api/v1/internal/users/:id",
    { preHandler: [gate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const user = await userRepository.findById(systemCtx, id);
      if (!user) throw new NotFoundError("User not found");
      return reply.status(200).send({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        roles: user.roles.map((r) => r.roleType),
        createdAt: user.createdAt.toISOString(),
      });
    },
  );

  // POST /api/v1/internal/users/:id/roles — grant a role
  fastify.post(
    "/api/v1/internal/users/:id/roles",
    { preHandler: [gate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const body = AddRoleBody.parse(request.body);
      const user = await userRepository.findById(systemCtx, id);
      if (!user) throw new NotFoundError("User not found");
      if (user.roles.some((r) => r.roleType === body.roleType)) {
        return reply.status(200).send({ ok: true, alreadyGranted: true });
      }
      await roleService.addRoleForUser(systemCtx, id, body.roleType as UserRoleType);
      return reply.status(201).send({ ok: true });
    },
  );

  // POST /api/v1/internal/users/:id/roles/activate — flip a verified role to ACTIVE
  // Called from admin-svc when a CRM/SRM/MSME/INTERVIEWER role application
  // is approved. Without this, JWTs come back with empty roles and every
  // role-gated endpoint rejects the user — silent demo killer.
  fastify.post(
    "/api/v1/internal/users/:id/roles/activate",
    { preHandler: [gate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const body = AddRoleBody.parse(request.body);
      await roleService.markRoleActive(systemCtx, id, body.roleType as UserRoleType);
      return reply.status(200).send({ ok: true });
    },
  );

  // POST /api/v1/internal/users/:id/status — suspend / ban / reactivate
  //
  // identity's UserStatus enum only has PENDING/ACTIVE/SUSPENDED. BANNED from
  // admin-svc maps to SUSPENDED at the auth boundary — the distinction is
  // preserved in admin-svc's audit log and the user.banned.v1 event.
  fastify.post(
    "/api/v1/internal/users/:id/status",
    { preHandler: [gate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const body = StatusBody.parse(request.body);
      const user = await userRepository.findById(systemCtx, id);
      if (!user) throw new NotFoundError("User not found");

      const dbStatus = body.status === "BANNED" ? "SUSPENDED" : body.status;
      await userRepository.updateStatus(systemCtx, id, dbStatus);

      if (body.status === "SUSPENDED" || body.status === "BANNED") {
        // Revoke all active sessions so the user is kicked on next request.
        await prisma.session.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return reply.status(200).send({ ok: true });
    },
  );

  // POST /api/v1/internal/users/:id/trigger-password-reset
  fastify.post(
    "/api/v1/internal/users/:id/trigger-password-reset",
    { preHandler: [gate] },
    async (request, reply) => {
      const { id } = IdParams.parse(request.params);
      const user = await userRepository.findById(systemCtx, id);
      if (!user) throw new NotFoundError("User not found");
      await passwordResetService.requestReset(systemCtx, user.email);
      return reply.status(200).send({ ok: true });
    },
  );

  // GET /api/v1/internal/users/search?q=<email|name>
  fastify.get(
    "/api/v1/internal/users/search",
    { preHandler: [gate] },
    async (request, reply) => {
      const { q, limit } = SearchQuery.parse(request.query);
      const term = q.trim();
      if (!term) throw new ValidationError("Query required");

      const users = await prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: term, mode: "insensitive" } },
            { firstName: { contains: term, mode: "insensitive" } },
            { lastName: { contains: term, mode: "insensitive" } },
          ],
        },
        include: { roles: true },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      return reply.status(200).send({
        data: users.map((u) => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          status: u.status,
          roles: u.roles.map((r) => r.roleType),
          createdAt: u.createdAt.toISOString(),
        })),
      });
    },
  );

  // GET /api/v1/internal/metrics/active-users
  fastify.get(
    "/api/v1/internal/metrics/active-users",
    { preHandler: [gate] },
    async (_request, reply) => {
      const value = await prisma.user.count({ where: { status: "ACTIVE" } });
      return reply.status(200).send({ value });
    },
  );

  // Sprint 12 — GET /api/v1/internal/users/by-role?role=CRM
  // Paginated list of users with an ACTIVE role membership. Used by
  // notification-svc to fan out REQUIREMENT_PUBLISHED to every CRM.
  fastify.get(
    "/api/v1/internal/users/by-role",
    { preHandler: [gate] },
    async (request, reply) => {
      const query = z
        .object({
          role: z.enum(["CUSTOMER", "CANDIDATE", "CRM", "SRM", "MSME", "INTERVIEWER", "ADMIN"]),
          cursor: z.string().uuid().optional(),
          limit: z.coerce.number().int().min(1).max(500).default(200),
        })
        .parse(request.query);

      const take = query.limit + 1;
      const rows = await prisma.user.findMany({
        where: {
          status: "ACTIVE",
          roles: { some: { roleType: query.role, status: "ACTIVE" } },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take,
        cursor: query.cursor ? { id: query.cursor } : undefined,
        skip: query.cursor ? 1 : 0,
        select: { id: true, email: true, firstName: true, lastName: true },
      });
      const hasMore = rows.length > query.limit;
      const data = hasMore ? rows.slice(0, query.limit) : rows;
      const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;
      return reply.status(200).send({ data, nextCursor, hasMore });
    },
  );
}
