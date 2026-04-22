import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { createLogger } from "@techorbit/logger";
import { getConfig } from "./config.js";

const VERSION = process.env.npm_package_version ?? "0.0.0";

export async function buildServer(): Promise<FastifyInstance> {
  const config = getConfig();
  const logger = createLogger({ name: config.SERVICE_NAME, level: config.LOG_LEVEL });

  const fastify = Fastify({
    logger: logger,
  });

  await fastify.register(cors);
  await fastify.register(helmet);

  fastify.get("/health", async () => {
    return { status: "ok", service: config.SERVICE_NAME, version: VERSION };
  });

  fastify.setErrorHandler((error, request, reply) => {
    logger.error({ err: error, url: request.url }, "Request error");
    reply.status(500).send({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  });

  return fastify;
}
