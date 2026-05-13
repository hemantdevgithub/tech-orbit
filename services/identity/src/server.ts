import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import cookie from "@fastify/cookie";

import type { EncryptionService } from "@techorbit/db-client";
import { createEncryptionService } from "@techorbit/db-client";
import { getConfig } from "./config.js";
import { createAuthMiddleware } from "@techorbit/auth-middleware";
import { setJwtKeys } from "./services/token.service.js";

// Declare Fastify decoration
declare module "fastify" {
  interface FastifyInstance {
    encryptionService: EncryptionService;
  }
}
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
import { internalIdentityRoutes } from "./routes/internal.routes.js";

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
  // Env files store PEMs with "\n" escape sequences — normalize to real newlines
  // before handing to @fastify/jwt / jose.
  const privatePem = process.env.JWT_PRIVATE_KEY.replace(/\\n/g, "\n");
  const publicPem = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, "\n");
  setJwtKeys(privatePem, publicPem);

  // Security middleware
  await fastify.register(cors, {
    origin: config.ALLOWED_ORIGINS?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });
  await fastify.register(helmet);
  await fastify.register(cookie);
  // Integration tests share one Fastify instance across files, so per-IP
  // rate-limit buckets would cross-pollute test files. Tests that need to
  // assert limiting enable it explicitly (see rate-limit.test.ts).
  if (process.env.DISABLE_RATE_LIMIT !== "1") {
    await fastify.register(rateLimit, {
      global: false, // Per-route limits instead
    });
  }

  // Register auth middleware
  await createAuthMiddleware(fastify, {
    publicKey: publicPem,
    verifyOptions: {
      algorithms: ["RS256"],
      clockTolerance: 30,
    },
  });

  // Initialize field encryption service (fails fast if KEK is missing)
  const encryptionService = createEncryptionService();
  fastify.decorate("encryptionService", encryptionService);

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

  // Internal (SERVICE-role) routes for admin-svc
  await fastify.register(internalIdentityRoutes);

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
