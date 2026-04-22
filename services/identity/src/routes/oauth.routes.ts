import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { SystemContext } from "@techorbit/auth-middleware";
import { randomBytes } from "crypto";
import { authService } from "../services/index.js";
import { oauthService } from "../services/index.js";

// ─── State store (in-memory for dev, use Redis in prod) ────────────────────────

const stateStore = new Map<string, { returnTo?: string; createdAt: Date }>();

function generateState(): string {
  return randomBytes(32).toString("hex");
}

function storeState(state: string, returnTo?: string): void {
  stateStore.set(state, { returnTo, createdAt: new Date() });
}

function consumeState(state: string): { returnTo?: string } | null {
  const data = stateStore.get(state);
  stateStore.delete(state);

  if (!data) return null;

  // State expires after 10 minutes
  const tenMinutes = 10 * 60 * 1000;
  if (Date.now() - data.createdAt.getTime() > tenMinutes) {
    return null;
  }

  return { returnTo: data.returnTo };
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────

export async function googleOAuthRoutes(fastify: FastifyInstance): Promise<void> {
  // Start Google OAuth
  fastify.get(
    "/api/v1/auth/oauth/google/start",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { returnTo } = request.query as { returnTo?: string };

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/v1/auth/oauth/google/callback";

      if (!clientId) {
        return reply.status(500).send({
          error: { code: "OAUTH_NOT_CONFIGURED", message: "Google OAuth not configured" },
        });
      }

      const state = generateState();
      storeState(state, returnTo);

      const authUrl = oauthService.getGoogleAuthUrl(clientId, redirectUri, state);

      return reply.redirect(302, authUrl);
    }
  );

  // Google OAuth callback
  fastify.get(
    "/api/v1/auth/oauth/google/callback",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { code, state } = request.query as { code?: string; state?: string };

      if (!code || !state) {
        return reply.status(400).send({
          error: { code: "INVALID_CALLBACK", message: "Missing code or state" },
        });
      }

      const stateData = consumeState(state);
      if (!stateData) {
        return reply.status(400).send({
          error: { code: "INVALID_STATE", message: "Invalid or expired OAuth state" },
        });
      }

      const clientId = process.env.GOOGLE_CLIENT_ID!;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
      const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/v1/auth/oauth/google/callback";

      const profile = await oauthService.exchangeGoogleCode(
        { type: "system" } as SystemContext,
        code,
        clientId,
        clientSecret,
        redirectUri
      );

      if (!profile) {
        return reply.status(401).send({
          error: { code: "OAUTH_FAILED", message: "Google OAuth failed" },
        });
      }

      const result = await oauthService.findOrLinkGoogleUser(
        { type: "system" } as SystemContext,
        profile
      );

      // For now, redirect to frontend with result
      // In production, issue tokens and redirect
      const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";

      if (result.isNewUser) {
        return reply.redirect(302, `${frontendUrl}/signup/verify-email?oauth=new`);
      }

      // Create session for returning user
      const loginResult = await authService.login(
        { type: "system" } as SystemContext,
        profile.email,
        "" // No password for OAuth users
      );

      if (loginResult.accessToken) {
        return reply.redirect(
          302,
          `${stateData.returnTo ?? frontendUrl}/dashboard?token=${loginResult.accessToken}`
        );
      }

      return reply.redirect(302, `${frontendUrl}/login?error=oauth_failed`);
    }
  );
}

// ─── LinkedIn OAuth ───────────────────────────────────────────────────────────

export async function linkedinOAuthRoutes(fastify: FastifyInstance): Promise<void> {
  // Start LinkedIn OAuth
  fastify.get(
    "/api/v1/auth/oauth/linkedin/start",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { returnTo } = request.query as { returnTo?: string };

      const clientId = process.env.LINKEDIN_CLIENT_ID;
      const redirectUri = process.env.LINKEDIN_REDIRECT_URI ?? "http://localhost:3000/api/v1/auth/oauth/linkedin/callback";

      if (!clientId) {
        return reply.status(500).send({
          error: { code: "OAUTH_NOT_CONFIGURED", message: "LinkedIn OAuth not configured" },
        });
      }

      const state = generateState();
      storeState(state, returnTo);

      const authUrl = oauthService.getLinkedInAuthUrl(clientId, redirectUri, state);

      return reply.redirect(302, authUrl);
    }
  );

  // LinkedIn OAuth callback
  fastify.get(
    "/api/v1/auth/oauth/linkedin/callback",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { code, state } = request.query as { code?: string; state?: string };

      if (!code || !state) {
        return reply.status(400).send({
          error: { code: "INVALID_CALLBACK", message: "Missing code or state" },
        });
      }

      const stateData = consumeState(state);
      if (!stateData) {
        return reply.status(400).send({
          error: { code: "INVALID_STATE", message: "Invalid or expired OAuth state" },
        });
      }

      const clientId = process.env.LINKEDIN_CLIENT_ID!;
      const clientSecret = process.env.LINKEDIN_CLIENT_SECRET ?? "";
      const redirectUri = process.env.LINKEDIN_REDIRECT_URI ?? "http://localhost:3000/api/v1/auth/oauth/linkedin/callback";

      const profile = await oauthService.exchangeLinkedInCode(
        code,
        clientId,
        clientSecret,
        redirectUri
      );

      if (!profile) {
        return reply.status(401).send({
          error: { code: "OAUTH_FAILED", message: "LinkedIn OAuth failed" },
        });
      }

      const result = await oauthService.findOrLinkLinkedInUser(
        { type: "system" } as SystemContext,
        profile
      );

      const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";

      if (result.isNewUser) {
        return reply.redirect(302, `${frontendUrl}/signup/verify-email?oauth=new`);
      }

      const loginResult = await authService.login(
        { type: "system" } as SystemContext,
        profile.email,
        ""
      );

      if (loginResult.accessToken) {
        return reply.redirect(
          302,
          `${stateData.returnTo ?? frontendUrl}/dashboard?token=${loginResult.accessToken}`
        );
      }

      return reply.redirect(302, `${frontendUrl}/login?error=oauth_failed`);
    }
  );
}
