import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { createAuthMiddleware } from "@techorbit/auth-middleware";
import { createEventBus } from "@techorbit/event-bus";
import { getConfig } from "./config.js";
import { createServiceTokenSigner } from "./lib/service-token.js";
import { createMatchingApi } from "./lib/matching-api.js";
import { createRequirementApi } from "./lib/requirement-api.js";
import { createInterviewApi } from "./lib/interview-api.js";
import { createPlacementService } from "./services/placement.service.js";
import { placementRoutes } from "./routes/placement.routes.js";
import { internalPlacementRoutes } from "./routes/internal.routes.js";
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

  if (!config.DISABLE_RATE_LIMIT) {
    await fastify.register(rateLimit, { global: false });
  }

  await createAuthMiddleware(fastify, {
    publicKey: publicPem,
    verifyOptions: { algorithms: ["RS256"], clockTolerance: 30 },
  });

  const signer = createServiceTokenSigner(config.JWT_PRIVATE_KEY, config.SERVICE_NAME);
  const matchingApi = createMatchingApi(config.MATCHING_SVC_URL, signer);
  const requirementApi = createRequirementApi(config.REQUIREMENT_SVC_URL, signer);
  const interviewApi = createInterviewApi(config.INTERVIEW_SVC_URL, signer);

  const placementService = createPlacementService({
    config,
    matchingApi,
    requirementApi,
    interviewApi,
  });
  await fastify.register(placementRoutes, { placementService });
  await fastify.register(internalPlacementRoutes);

  if (config.RABBITMQ_URL) {
    const eventBus = createEventBus(
      { url: config.RABBITMQ_URL, exchange: "techorbit.events" },
      config.SERVICE_NAME,
    );
    fastify.addHook("onReady", async () => {
      await eventBus.connect();
      startOutboxWorker(eventBus);
      fastify.log.info("Event bus connected, outbox worker started");
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
