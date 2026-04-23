import { z } from "zod";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { UnauthorizedError } from "@techorbit/errors";

export const AuthContextSchema = z.object({
  type: z.literal("user"),
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  roles: z.array(z.string()),
});

export type AuthContext = z.infer<typeof AuthContextSchema>;

// System context used by internal services that need to bypass auth checks
export type SystemContext = { type: "system" };

export type RequestContext = AuthContext | SystemContext;

export interface AuthMiddlewareOptions {
  publicKey: string;
  verifyOptions?: {
    algorithms?: ("HS256" | "RS256")[];
    clockTolerance?: number;
  };
}

declare module "fastify" {
  interface FastifyRequest {
    auth: AuthContext;
    authenticate(): Promise<void>;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export async function createAuthMiddleware(
  fastify: FastifyInstance,
  options: AuthMiddlewareOptions
): Promise<void> {
  // @fastify/jwt is used here for verification only. If we declared a sign
  // algorithm, the plugin would also require a private key, which this
  // package intentionally doesn't carry — signing lives in the identity
  // service. Omitting `sign` keeps us verify-only.
  await fastify.register(await import("@fastify/jwt"), {
    secret: { public: options.publicKey },
    verify: {
      algorithms: options.verifyOptions?.algorithms ?? ["RS256"],
      clockTolerance: options.verifyOptions?.clockTolerance ?? 30,
    },
  });

  fastify.decorate(
    "authenticate",
    async function (request: FastifyRequest, _reply: FastifyReply) {
      try {
        const decoded = await request.jwtVerify<{
          sub: string;
          sessionId: string;
          roles: string[];
        }>();

        request.auth = {
          type: "user",
          userId: decoded.sub,
          sessionId: decoded.sessionId,
          roles: decoded.roles ?? [],
        };
      } catch {
        throw new UnauthorizedError("Invalid or expired token");
      }
    }
  );
}

// Role gate for service-to-service endpoints.  The caller must present a
// SERVICE-role JWT (minted by a trusted sibling service with the shared
// signing key).  Intentionally strict: SERVICE is not treated as a superset
// of user roles; a SERVICE token can only hit endpoints explicitly guarded
// by this middleware.
export function requireServiceRole(_fastify: FastifyInstance) {
  return async function (request: FastifyRequest, _reply: FastifyReply) {
    await request.authenticate();
    if (!request.auth.roles.includes("SERVICE")) {
      throw new UnauthorizedError("Service role required");
    }
  };
}

export function requireRole(fastify: FastifyInstance, role: string) {
  return async function (request: FastifyRequest, _reply: FastifyReply) {
    await request.authenticate();

    if (!request.auth.roles.includes(role)) {
      throw new UnauthorizedError(`Role '${role}' required`);
    }
  };
}

export function requireAnyRole(fastify: FastifyInstance, ...roles: string[]) {
  return async function (request: FastifyRequest, _reply: FastifyReply) {
    await request.authenticate();

    const hasRole = roles.some((role) => request.auth.roles.includes(role));
    if (!hasRole) {
      throw new UnauthorizedError(`One of roles [${roles.join(", ")}] required`);
    }
  };
}

export function requireAllRoles(fastify: FastifyInstance, ...roles: string[]) {
  return async function (request: FastifyRequest, _reply: FastifyReply) {
    await request.authenticate();

    const hasAllRoles = roles.every((role) => request.auth.roles.includes(role));
    if (!hasAllRoles) {
      throw new UnauthorizedError(`All roles [${roles.join(", ")}] required`);
    }
  };
}

// ─── Token verification helper ─────────────────────────────────────────────────

export interface TokenVerificationResult {
  valid: boolean;
  userId?: string;
  sessionId?: string;
  roles?: string[];
  error?: string;
}