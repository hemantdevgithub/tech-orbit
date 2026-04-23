import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { createAuthMiddleware } from "@techorbit/auth-middleware";
import { createEventBus } from "@techorbit/event-bus";
import { getConfig } from "./config.js";
import { createServiceTokenSigner } from "./lib/service-token.js";
import { createDailyApi } from "./lib/daily.js";
import { createMatchingApi } from "./lib/matching-api.js";
import { createProfileApi } from "./lib/profile-api.js";
import { createInterviewService } from "./services/interview.service.js";
import { interviewRoutes } from "./routes/interview.routes.js";
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
  const dailyApi = createDailyApi(config.DAILY_API_KEY, config.DAILY_DOMAIN);
  const matchingApi = createMatchingApi(config.MATCHING_SVC_URL, signer);
  const profileApi = createProfileApi(config.PROFILE_SVC_URL, signer);

  // profileApi is available for future routes; keep it in scope.
  void profileApi;

  const interviewService = createInterviewService({ config, dailyApi, matchingApi });
  await fastify.register(interviewRoutes, { interviewService });

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
