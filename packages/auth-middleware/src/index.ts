import { z } from "zod";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { UnauthorizedError } from "@techorbit/errors";

export const AuthContextSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  roles: z.array(z.string()),
});

export type AuthContext = z.infer<typeof AuthContextSchema>;

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
  await fastify.register(await import("@fastify/jwt"), {
    secret: options.publicKey,
    sign: { algorithm: "RS256" },
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