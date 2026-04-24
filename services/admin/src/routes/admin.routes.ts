import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  AuditLogFilterSchema,
  BanUserSchema,
  SuspendUserSchema,
} from "@techorbit/types";
import type { UserManagementService } from "../services/user-management.service.js";
import type { AuditLogService } from "../services/audit-log.service.js";
import type { DashboardService } from "../services/dashboard.service.js";

const UserIdParams = z.object({ userId: z.string().uuid() });
const SearchQuery = z.object({ q: z.string().min(1).max(200) });

export async function adminRoutes(
  fastify: FastifyInstance,
  options: {
    userManagementService: UserManagementService;
    auditLogService: AuditLogService;
    dashboardService: DashboardService;
  },
): Promise<void> {
  const { userManagementService, auditLogService, dashboardService } = options;

  // User management
  fastify.post(
    "/api/v1/admin/users/:userId/suspend",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { userId } = UserIdParams.parse(request.params);
      const body = SuspendUserSchema.parse(request.body);
      const result = await userManagementService.suspend(request.auth, userId, body);
      return reply.status(200).send(result);
    },
  );

  fastify.post(
    "/api/v1/admin/users/:userId/ban",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { userId } = UserIdParams.parse(request.params);
      const body = BanUserSchema.parse(request.body);
      const result = await userManagementService.ban(request.auth, userId, body);
      return reply.status(200).send(result);
    },
  );

  fastify.post(
    "/api/v1/admin/users/:userId/reset-password",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { userId } = UserIdParams.parse(request.params);
      const result = await userManagementService.triggerPasswordReset(request.auth, userId);
      return reply.status(200).send(result);
    },
  );

  fastify.get(
    "/api/v1/admin/users/search",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { q } = SearchQuery.parse(request.query);
      const result = await userManagementService.search(request.auth, q);
      return reply.status(200).send(result);
    },
  );

  // Audit logs
  fastify.get(
    "/api/v1/admin/audit-logs",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const filter = AuditLogFilterSchema.parse(request.query);
      const result = await auditLogService.list(request.auth, filter);
      return reply.status(200).send(result);
    },
  );

  // Dashboard metrics
  fastify.get(
    "/api/v1/admin/dashboard/metrics",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const result = await dashboardService.metrics(request.auth);
      return reply.status(200).send(result);
    },
  );
}
