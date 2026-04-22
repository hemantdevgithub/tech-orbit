import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import cookie from "@fastify/cookie";

import { getConfig } from "./config.js";
import { createAuthMiddleware } from "@techorbit/auth-middleware";
import { setJwtKeys } from "./services/token.service.js";
import {
  registerRoutes,
  loginRoutes,
  refreshRoutes,
  logoutRoutes,
  twoFARoutes,
  passwordResetRoutes,
  meRoutes,
} from "./routes/auth.routes.js";
import { googleOAuthRoutes, linkedinOAuthRoutes } from "./routes/oauth.routes.js";

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

  // Initialize JWT keys
  if (!process.env.JWT_PRIVATE_KEY || !process.env.JWT_PUBLIC_KEY) {
    throw new Error("JWT_PRIVATE_KEY and JWT_PUBLIC_KEY environment variables are required");
  }
  setJwtKeys(process.env.JWT_PRIVATE_KEY, process.env.JWT_PUBLIC_KEY);

  // Security middleware
  await fastify.register(cors, {
    origin: config.ALLOWED_ORIGINS?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });
  await fastify.register(helmet);
  await fastify.register(cookie);
  await fastify.register(rateLimit, {
    global: false, // Per-route limits instead
  });

  // Register auth middleware
  await createAuthMiddleware(fastify, {
    publicKey: process.env.JWT_PUBLIC_KEY ?? "",
    verifyOptions: {
      algorithms: ["RS256"],
      clockTolerance: 30,
    },
  });

  // Auth routes
  await fastify.register(registerRoutes);
  await fastify.register(loginRoutes);
  await fastify.register(refreshRoutes);
  await fastify.register(logoutRoutes);
  await fastify.register(twoFARoutes);
  await fastify.register(passwordResetRoutes);
  await fastify.register(meRoutes);

  // OAuth routes
  await fastify.register(googleOAuthRoutes);
  await fastify.register(linkedinOAuthRoutes);

  // Health endpoint
  fastify.get("/health", async () => {
    return { status: "ok", service: config.SERVICE_NAME, version: VERSION };
  });

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error({ err: error, url: request.url }, "Request error");

    // Handle Fastify validation errors
    if (error.validation) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request",
          details: error.validation,
        },
      });
    }

    // Handle custom errors
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
