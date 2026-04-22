import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { SystemContext } from "@techorbit/auth-middleware";
import type { EncryptedField } from "@techorbit/db-client";
import { authService, roleService, twoFAService } from "../services/index.js";
import { validatePasswordStrength } from "../services/password.service.js";

// ─── System context helper ─────────────────────────────────────────────────────

const systemCtx: SystemContext = { type: "system" };

// ─── Cookie helpers ──────────────────────────────────────────────────────────

const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN ?? "localhost";
const COOKIE_SECURE = process.env.NODE_ENV === "production";

function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: COOKIE_SECURE,
    // Refresh token cookie is used by /refresh and cleared by /logout,
    // so scope to the auth namespace (both endpoints live under /api/v1/auth).
    path: "/api/v1/auth",
    maxAge: 14 * 24 * 60 * 60, // 14 days in seconds
    domain: COOKIE_DOMAIN,
  };
}

// ─── Register ─────────────────────────────────────────────────────────────────

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    "/api/v1/auth/register",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 hour",
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as Record<string, unknown>;
      const email = (body.email as string)?.toLowerCase();
      const password = body.password as string;
      const firstName = body.firstName as string;
      const lastName = body.lastName as string;

      // Basic validation
      if (!email || !password || !firstName || !lastName) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: "All fields are required" },
        });
      }

      if (password.length < 12) {
        return reply.status(400).send({
          error: { code: "WEAK_PASSWORD", message: "Password must be at least 12 characters" },
        });
      }

      // Validate password strength with zxcvbn
      const strength = validatePasswordStrength(password);
      if (!strength.isAcceptable) {
        return reply.status(400).send({
          error: {
            code: "WEAK_PASSWORD",
            message: strength.feedback || "Password does not meet strength requirements",
          },
        });
      }

      const result = await authService.register(
        systemCtx,
        email,
        password,
        firstName,
        lastName,
        request.ip ?? undefined,
        request.headers["user-agent"] ?? undefined
      );

      if (result.refreshToken) {
        reply.setCookie("refresh_token", result.refreshToken, getRefreshCookieOptions());
      }

      // Email enumeration prevention: always return 201.
      // On duplicate-email we return the same shape with no token fields.
      return reply.status(201).send({
        message: "Registration successful",
        accessToken: result.accessToken,
        tokenType: result.accessToken ? "Bearer" : undefined,
        expiresIn: result.expiresIn,
        require2FA: result.requires2FA ?? false,
      });
    }
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    "/api/v1/auth/login",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "15 minutes",
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as Record<string, unknown>;
      const email = (body.email as string)?.toLowerCase();
      const password = body.password as string;

      if (!email || !password) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: "Email and password are required" },
        });
      }

      const result = await authService.login(
        systemCtx,
        email,
        password,
        request.ip ?? undefined,
        request.headers["user-agent"] ?? undefined
      );

      // Wrong password / non-existent user = same response
      if (!result.accessToken && !result.requires2FA) {
        return reply.status(401).send({
          error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
        });
      }

      // 2FA required — return partial auth
      if (result.requires2FA) {
        return reply.status(200).send({
          require2FA: true,
          challengeToken: result.challengeToken,
          expiresIn: result.expiresIn,
        });
      }

      if (result.refreshToken) {
        reply.setCookie("refresh_token", result.refreshToken, getRefreshCookieOptions());
      }

      return reply.status(200).send({
        accessToken: result.accessToken,
        tokenType: "Bearer",
        expiresIn: result.expiresIn,
      });
    }
  );
}

// ─── Refresh ─────────────────────────────────────────────────────────────────

export async function refreshRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    "/api/v1/auth/refresh",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const refreshToken = request.cookies?.refresh_token;

      if (!refreshToken) {
        return reply.status(401).send({
          error: { code: "NO_REFRESH_TOKEN", message: "Refresh token required" },
        });
      }

      try {
        const result = await authService.refreshSession(systemCtx, refreshToken);

        reply.setCookie("refresh_token", result.refreshToken, getRefreshCookieOptions());

        return reply.status(200).send({
          accessToken: result.accessToken,
          tokenType: "Bearer",
          expiresIn: result.expiresIn,
        });
      } catch {
        // Replay detection or invalid token
        reply.clearCookie("refresh_token", getRefreshCookieOptions());

        return reply.status(401).send({
          error: {
            code: "SESSION_REVOKED",
            message: "Session has been revoked. Please log in again.",
          },
        });
      }
    }
  );
}

// ─── Logout ──────────────────────────────────────────────────────────────────

export async function logoutRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    "/api/v1/auth/logout",
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = request.auth;

      await authService.logout(systemCtx, ctx.sessionId, ctx.userId);

      reply.clearCookie("refresh_token", getRefreshCookieOptions());

      return reply.status(200).send({ success: true });
    }
  );
}

// ─── 2FA Routes ────────────────────────────────────────────────────────────────

export async function twoFARoutes(fastify: FastifyInstance): Promise<void> {
  // Setup 2FA (requires authentication)
  fastify.post(
    "/api/v1/auth/2fa/setup",
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = request.auth;

      const result = await twoFAService.setupTOTP(
        systemCtx,
        ctx.userId,
        "user@techorbit.dev", // Would come from user profile
        fastify.encryptionService
      );

      return reply.status(200).send(result);
    }
  );

  // Verify 2FA
  fastify.post(
    "/api/v1/auth/2fa/verify",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as Record<string, unknown>;
      const challengeToken = body.challengeToken as string | undefined;
      const code = body.code as string | undefined;

      if (!code) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: "Code required" },
        });
      }

      // If we have a challenge token, verify it first
      if (challengeToken) {
        const { verify2FAChallengeToken } = await import("../services/token.service.js");
        const userId = await verify2FAChallengeToken(challengeToken);

        if (!userId) {
          return reply.status(401).send({
            error: { code: "INVALID_CHALLENGE", message: "Challenge expired or invalid" },
          });
        }

        // Get user and verify TOTP
        const { userRepository } = await import("../repositories/index.js");
        const user = await userRepository.findById(systemCtx, userId);

        if (!user || !user.twoFASecretEncrypted) {
          return reply.status(401).send({
            error: { code: "2FA_NOT_CONFIGURED", message: "2FA not configured" },
          });
        }

        let secret: string;
        try {
          secret = await fastify.encryptionService.decrypt(user.twoFASecretEncrypted as EncryptedField, {
            purpose: "2fa_secret",
            userId,
          });
        } catch (error) {
          return reply.status(500).send({
            error: { code: "DECRYPTION_ERROR", message: "Failed to decrypt 2FA secret" },
          });
        }

        const { authenticator } = await import("otplib");
        const isValid = authenticator.verify({ token: code, secret });

        if (!isValid) {
          return reply.status(401).send({
            error: { code: "INVALID_CODE", message: "Invalid 2FA code" },
          });
        }

        // Create session and issue token
        const loginResult = await authService.verify2FAAndLogin(
          systemCtx,
          userId,
          "",
          challengeToken
        );

        if (loginResult.refreshToken) {
          reply.setCookie("refresh_token", loginResult.refreshToken, getRefreshCookieOptions());
        }

        return reply.status(200).send({
          accessToken: loginResult.accessToken,
          tokenType: "Bearer",
          expiresIn: loginResult.expiresIn,
        });
      }

      // Direct verification with access token (during setup)
      const ctx = request.auth;
      const { userRepository } = await import("../repositories/index.js");
      const { authenticator } = await import("otplib");

      const user = await userRepository.findById(systemCtx, ctx.userId);

      if (!user || !user.twoFASecretEncrypted) {
        return reply.status(400).send({
          error: { code: "2FA_NOT_SETUP", message: "2FA not set up" },
        });
      }

      let secret: string;
      try {
        secret = await fastify.encryptionService.decrypt(user.twoFASecretEncrypted as EncryptedField, {
          purpose: "2fa_secret",
          userId: ctx.userId,
        });
      } catch (error) {
        return reply.status(500).send({
          error: { code: "DECRYPTION_ERROR", message: "Failed to decrypt 2FA secret" },
        });
      }

      const isValid = authenticator.verify({ token: code, secret });

      if (!isValid) {
        return reply.status(401).send({
          error: { code: "INVALID_CODE", message: "Invalid 2FA code" },
        });
      }

      return reply.status(200).send({ success: true });
    }
  );

  // Disable 2FA
  fastify.post(
    "/api/v1/auth/2fa/disable",
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as Record<string, unknown>;
      const code = body.code as string | undefined;
      const password = body.password as string | undefined;

      if (!code || !password) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: "Code and password required" },
        });
      }

      const ctx = request.auth;
      const { userRepository } = await import("../repositories/index.js");
      const { verifyPassword } = await import("../services/password.service.js");

      const user = await userRepository.findById(systemCtx, ctx.userId);

      if (!user || !user.passwordHash) {
        return reply.status(400).send({
          error: { code: "INVALID_REQUEST", message: "Cannot disable 2FA" },
        });
      }

      // Verify password
      const passwordValid = await verifyPassword(user.passwordHash, password);
      if (!passwordValid) {
        return reply.status(401).send({
          error: { code: "INVALID_PASSWORD", message: "Invalid password" },
        });
      }

      // Verify TOTP
      if (!user.twoFASecretEncrypted) {
        return reply.status(400).send({
          error: { code: "2FA_NOT_ENABLED", message: "2FA is not enabled" },
        });
      }

      let secret: string;
      try {
        secret = await fastify.encryptionService.decrypt(user.twoFASecretEncrypted as EncryptedField, {
          purpose: "2fa_secret",
          userId: ctx.userId,
        });
      } catch (error) {
        return reply.status(500).send({
          error: { code: "DECRYPTION_ERROR", message: "Failed to decrypt 2FA secret" },
        });
      }

      const { authenticator } = await import("otplib");
      const isValid = authenticator.verify({ token: code, secret });

      if (!isValid) {
        return reply.status(401).send({
          error: { code: "INVALID_CODE", message: "Invalid 2FA code" },
        });
      }

      await twoFAService.disable2FA(systemCtx, ctx.userId);

      return reply.status(200).send({ success: true });
    }
  );
}

// ─── Password Reset Routes ─────────────────────────────────────────────────────

export async function passwordResetRoutes(fastify: FastifyInstance): Promise<void> {
  // Request password reset
  fastify.post(
    "/api/v1/auth/password/reset/request",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "15 minutes",
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as Record<string, unknown>;
      const email = body.email as string | undefined;

      if (!email) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: "Email required" },
        });
      }

      const { passwordResetService } = await import("../services/index.js");
      await passwordResetService.requestReset(systemCtx, email);

      // Always return 200 to prevent email enumeration
      return reply.status(200).send({
        message: "If an account exists with this email, a reset link has been sent",
      });
    }
  );

  // Confirm password reset
  fastify.post(
    "/api/v1/auth/password/reset/confirm",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as Record<string, unknown>;
      const token = body.token as string | undefined;
      const password = body.password as string | undefined;

      if (!token || !password) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: "Token and password required" },
        });
      }

      // Validate password strength
      const strength = validatePasswordStrength(password);
      if (!strength.isAcceptable) {
        return reply.status(400).send({
          error: {
            code: "WEAK_PASSWORD",
            message: strength.feedback || "Password does not meet strength requirements",
          },
        });
      }

      const { passwordResetService } = await import("../services/index.js");
      const result = await passwordResetService.confirmReset(systemCtx, token, password);

      if (!result.success) {
        return reply.status(400).send({
          error: { code: "INVALID_TOKEN", message: "Reset token is invalid or expired" },
        });
      }

      return reply.status(200).send({ success: true });
    }
  );
}

// ─── Me Routes ────────────────────────────────────────────────────────────────

export async function meRoutes(fastify: FastifyInstance): Promise<void> {
  // Get current user
  fastify.get(
    "/api/v1/me",
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = request.auth;

      const me = await authService.getMe(systemCtx, ctx.userId);

      return reply.status(200).send(me);
    }
  );

  // Add role to current user
  fastify.post(
    "/api/v1/me/roles",
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as Record<string, unknown>;
      const roleType = body.roleType as string | undefined;

      if (!roleType) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: "Role type required" },
        });
      }

      const validRoles = ["CUSTOMER", "CANDIDATE", "CRM", "SRM", "MSME", "INTERVIEWER"];
      if (!validRoles.includes(roleType)) {
        return reply.status(400).send({
          error: { code: "INVALID_ROLE", message: "Invalid role type" },
        });
      }

      const ctx = request.auth;

      const result = await roleService.addRoleForUser(
        systemCtx,
        ctx.userId,
        roleType as "CUSTOMER" | "CANDIDATE" | "CRM" | "SRM" | "MSME" | "INTERVIEWER"
      );

      return reply.status(201).send(result);
    }
  );
}
