import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";

import { getConfig } from "./config.js";

const VERSION = process.env.npm_package_version ?? "0.0.0";

export async function buildServer(): Promise<FastifyInstance> {
  const config = getConfig();

  const fastify = Fastify({
    logger: { level: config.LOG_LEVEL, name: config.SERVICE_NAME, serializers: { req: (req) => ({ url: req.url, method: req.method }), res: (res) => ({ statusCode: res.statusCode }) } },
  });

  await fastify.register(cors);
  await fastify.register(helmet);

  fastify.get("/health", async () => {
    return { status: "ok", service: config.SERVICE_NAME, version: VERSION };
  });

  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error({ err: error, url: request.url }, "Request error");
    reply.status(500).send({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  });

  return fastify;
}
