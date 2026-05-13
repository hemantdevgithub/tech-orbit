import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import proxy from "@fastify/http-proxy";

import { getConfig, getRoutes } from "./config.js";

const VERSION = process.env.npm_package_version ?? "0.0.0";

export async function buildServer(): Promise<FastifyInstance> {
  const config = getConfig();

  const fastify = Fastify({
    logger: { level: config.LOG_LEVEL, name: config.SERVICE_NAME, serializers: { req: (req) => ({ url: req.url, method: req.method }), res: (res) => ({ statusCode: res.statusCode }) } },
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
  for (const routeConfig of Object.values(routes)) {
    await fastify.register(proxy, {
      upstream: routeConfig.upstream,
      prefix: routeConfig.prefix,
      replyOptions: {
        onError: (reply, error) => {
          fastify.log.error({ err: error }, "Proxy error");
          reply.send(error);
        },
      },
    });
  }

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error({ err: error, url: request.url }, "Request error");
    reply.status(500).send({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  });

  return fastify;
}

export async function startServer(fastify: FastifyInstance): Promise<void> {
  const config = getConfig();
  const host = "0.0.0.0";
  const port = config.PORT;

  await fastify.listen({ host, port });
  fastify.log.info({ host, port }, "Server started");
}
