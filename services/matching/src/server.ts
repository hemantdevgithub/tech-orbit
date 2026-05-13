import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { createAuthMiddleware } from "@techorbit/auth-middleware";
import { createEventBus } from "@techorbit/event-bus";
import { getConfig } from "./config.js";
import { createServiceTokenSigner } from "./lib/service-token.js";
import { createProfileApi } from "./lib/profile-api.js";
import { createRequirementApi } from "./lib/requirement-api.js";
import { registerRequirementPublishedConsumer } from "./consumers/requirement-published.consumer.js";
import { startOutboxWorker, stopOutboxWorker } from "./lib/outbox-worker.js";
import { submissionRoutes } from "./routes/submission.routes.js";
import { internalMatchingRoutes } from "./routes/internal.routes.js";
import { createSubmissionService } from "./services/submission.service.js";

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

  // Service-to-service clients, used by the submission service + consumers.
  const signer = createServiceTokenSigner(config.JWT_PRIVATE_KEY, config.SERVICE_NAME);
  const profileApi = createProfileApi(config.PROFILE_SVC_URL, signer);
  const requirementApi = createRequirementApi(
    config.REQUIREMENT_SVC_URL,
    signer,
  );

  const submissionService = createSubmissionService({
    config,
    profileApi,
    requirementApi,
  });

  await fastify.register(submissionRoutes, { submissionService });
  await fastify.register(internalMatchingRoutes);

  // Event-driven: consume requirement.published.v1 and relay our own
  // outgoing events if RabbitMQ is wired.  In tests without RabbitMQ this
  // block stays dormant and rows accumulate in outgoing_event.
  if (config.RABBITMQ_URL) {
    const eventBus = createEventBus(
      { url: config.RABBITMQ_URL, exchange: "techorbit.events" },
      config.SERVICE_NAME,
    );
    fastify.addHook("onReady", async () => {
      await eventBus.connect();
      await registerRequirementPublishedConsumer(eventBus, {
        profileApi,
        requirementApi,
        logger: fastify.log,
      });
      startOutboxWorker(eventBus);
      fastify.log.info("Event bus connected, consumer registered, outbox worker started");
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
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request",
          details: error.validation,
        },
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

