import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { createAuthMiddleware } from "@techorbit/auth-middleware";
import { createEventBus } from "@techorbit/event-bus";

import { getConfig } from "./config.js";
import { createServiceTokenSigner } from "./lib/service-token.js";
import { createIdentityApi } from "./lib/identity-api.js";
import { createMetricsApi } from "./lib/metrics-api.js";
import { createRoleApplicationService } from "./services/role-application.service.js";
import { createDisputeService } from "./services/dispute.service.js";
import { createUserManagementService } from "./services/user-management.service.js";
import { createAuditLogService } from "./services/audit-log.service.js";
import { createDashboardService } from "./services/dashboard.service.js";
import { roleApplicationRoutes } from "./routes/role-application.routes.js";
import { disputeRoutes } from "./routes/dispute.routes.js";
import { adminRoutes } from "./routes/admin.routes.js";
import { startOutboxWorker, stopOutboxWorker } from "./lib/outbox-worker.js";

const VERSION = process.env.npm_package_version ?? "0.0.0";

export async function buildServer(): Promise<FastifyInstance> {
  const config = getConfig();

  const fastify = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      name: config.SERVICE_NAME,
      serializers: {
        req: (req) => ({ url: req.url, method: req.method }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    },
  });

  const publicPem = config.JWT_PUBLIC_KEY.replace(/\\n/g, "\n");

  await fastify.register(cors, {
    origin: config.ALLOWED_ORIGINS?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });
  await fastify.register(helmet);
  // Rate-limit admin mutations to mitigate impersonated-token abuse.
  // 30/min per admin session is well above normal human click rates.
  await fastify.register(rateLimit, { global: false, max: 30, timeWindow: "1 minute" });

  await createAuthMiddleware(fastify, {
    publicKey: publicPem,
    verifyOptions: { algorithms: ["RS256"], clockTolerance: 30 },
  });

  const signer = createServiceTokenSigner(config.JWT_PRIVATE_KEY, config.SERVICE_NAME);
  const identityApi = createIdentityApi(config.IDENTITY_SVC_URL, signer);
  const metricsApi = createMetricsApi(signer, {
    identity: config.IDENTITY_SVC_URL,
    placement: config.PLACEMENT_SVC_URL,
    payments: config.PAYMENTS_SVC_URL,
  });

  const roleApplicationService = createRoleApplicationService({ identityApi });
  const disputeService = createDisputeService();
  const userManagementService = createUserManagementService({ identityApi });
  const auditLogService = createAuditLogService();
  const dashboardService = createDashboardService({
    metricsApi,
    roleApplicationService,
    disputeService,
  });

  await fastify.register(roleApplicationRoutes, { roleApplicationService });
  await fastify.register(disputeRoutes, { disputeService });
  await fastify.register(adminRoutes, {
    userManagementService,
    auditLogService,
    dashboardService,
  });

  if (config.RABBITMQ_URL) {
    const eventBus = createEventBus(
      { url: config.RABBITMQ_URL, exchange: "techorbit.events" },
      config.SERVICE_NAME,
    );
    fastify.addHook("onReady", async () => {
      await eventBus.connect();
      startOutboxWorker(eventBus);
      fastify.log.info("Event bus connected, outbox started");
    });
    fastify.addHook("onClose", async () => {
      stopOutboxWorker();
      await eventBus.disconnect();
    });
  }

  fastify.get("/health", async () => ({
    status: "ok",
    service: config.SERVICE_NAME,
    version: VERSION,
  }));

  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error({ err: error, url: request.url }, "Request error");
    if (error.validation) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "Invalid request", details: error.validation },
      });
    }
    const statusCode = error.statusCode ?? 500;
    return reply.status(statusCode).send({
      error: {
        code: error.code ?? "INTERNAL_ERROR",
        message: statusCode < 500 ? error.message : "Internal server error",
      },
    });
  });

  return fastify;
}
