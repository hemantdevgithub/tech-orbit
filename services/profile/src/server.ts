import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { createAuthMiddleware } from "@techorbit/auth-middleware";
import { createEncryptionService } from "@techorbit/db-client";
import { createEventBus } from "@techorbit/event-bus";
import { getConfig } from "./config.js";
import { candidateRoutes } from "./routes/candidate.routes.js";
import { msmeRoutes } from "./routes/msme.routes.js";
import { customerRoutes } from "./routes/customer.routes.js";
import { interviewerRoutes } from "./routes/interviewer.routes.js";
import { internalRoutes } from "./routes/internal.routes.js";
import { createMsmeService } from "./services/msme.service.js";
import { createCustomerService } from "./services/customer.service.js";
import { createCandidateService } from "./services/candidate.service.js";
import {
  createInterviewApi,
  createNullInterviewApi,
} from "./lib/interview-api.js";
import { createServiceTokenSigner } from "./lib/service-token.js";
import { registerUserEventConsumers } from "./consumers/user-events.consumer.js";

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

  const encryptionService = createEncryptionService();
  const msmeService = createMsmeService(encryptionService);
  const customerService = createCustomerService(encryptionService);

  const interviewApi =
    config.JWT_PRIVATE_KEY && config.INTERVIEW_SVC_URL
      ? createInterviewApi(
          config.INTERVIEW_SVC_URL,
          createServiceTokenSigner(config.JWT_PRIVATE_KEY, config.SERVICE_NAME),
        )
      : createNullInterviewApi();
  const candidateService = createCandidateService({ interviewApi });

  await fastify.register(candidateRoutes, { candidateService });
  await fastify.register(msmeRoutes, { msmeService });
  await fastify.register(customerRoutes, { customerService });
  await fastify.register(interviewerRoutes);
  await fastify.register(internalRoutes);

  // Wire up event consumers if RabbitMQ is configured
  if (config.RABBITMQ_URL) {
    const eventBus = createEventBus({ url: config.RABBITMQ_URL }, config.SERVICE_NAME);
    fastify.addHook("onReady", async () => {
      await eventBus.connect();
      await registerUserEventConsumers(eventBus);
      fastify.log.info("Event bus connected and consumers registered");
    });
    fastify.addHook("onClose", async () => {
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

    // Detect Zod first — it reaches here via `.parse()` in route handlers,
    // and its `instanceof` can fail across dual-bundled zod versions.
    const maybeZod = error as unknown as { issues?: unknown[]; name?: string };
    if (Array.isArray(maybeZod.issues) && maybeZod.name === "ZodError") {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "Invalid request", details: maybeZod.issues },
      });
    }

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
