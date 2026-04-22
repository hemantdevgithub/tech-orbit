import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import proxy from "@fastify/http-proxy";
import { createLogger } from "@techorbit/logger";
import { getConfig, getRoutes } from "./config.js";

const VERSION = process.env.npm_package_version ?? "0.0.0";

export async function buildServer(): Promise<FastifyInstance> {
  const config = getConfig();
  const logger = createLogger({ name: config.SERVICE_NAME, level: config.LOG_LEVEL });

  const fastify = Fastify({
    logger: logger,
  });

  // Security middleware
  await fastify.register(cors);
  await fastify.register(helmet);

  // Health endpoint
  fastify.get("/health", async () => {
    return { status: "ok", service: config.SERVICE_NAME, version: VERSION };
  });

  // Register proxy routes
  const routes = getRoutes();
  for (const [path, routeConfig] of Object.entries(routes)) {
    await fastify.register(proxy, {
      upstream: routeConfig.upstream,
      prefix: routeConfig.prefix,
      replyOptions: {
        onError: (reply, error) => {
          logger.error({ err: error }, "Proxy error");
          reply.send(error);
        },
      },
    });
  }

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    logger.error({ err: error, url: request.url }, "Request error");
    reply.status(500).send({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  });

  return fastify;
}

export async function startServer(fastify: FastifyInstance): Promise<void> {
  const config = getConfig();
  const host = "0.0.0.0";
  const port = config.PORT;

  await fastify.listen({ host, port });
  logger.info({ host, port }, "Server started");
}
