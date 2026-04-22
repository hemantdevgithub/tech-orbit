import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { createAuthMiddleware } from "@techorbit/auth-middleware";
import { getConfig } from "./config.js";
import { requirementRoutes } from "./routes/requirement.routes.js";
import { crmAttributionRoutes } from "./routes/crm-attribution.routes.js";
import { createRequirementService } from "./services/requirement.service.js";
import { createCrmAttributionService } from "./services/crm-attribution.service.js";

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

  const requirementService = createRequirementService(config);
  const crmAttributionService = createCrmAttributionService();

  await fastify.register(requirementRoutes, { requirementService });
  await fastify.register(crmAttributionRoutes, { crmAttributionService });

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
