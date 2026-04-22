/**
 * Generate services/identity/openapi.yaml from the Zod schemas in
 * @techorbit/types. Run via `pnpm openapi:generate`.
 *
 * Every route in src/routes/auth.routes.ts and oauth.routes.ts must have a
 * registered path here. If you add a new route, add a `registry.registerPath`
 * entry below too.
 */
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { z } from "zod";

import {
  AddRoleRequestSchema,
  ErrorResponse,
  Login2FAResponseSchema,
  LoginRequestSchema,
  LoginSuccessResponseSchema,
  MeResponseSchema,
  PasswordResetConfirmSchema,
  PasswordResetRequestResponseSchema,
  PasswordResetRequestSchema,
  RegisterRequestSchema,
  RegisterResponseSchema,
  TokenRefreshResponseSchema,
  TwoFADisableRequestSchema,
  TwoFASetupResponseSchema,
  TwoFAVerifyRequestSchema,
} from "@techorbit/types";

extendZodWithOpenApi(z);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(__dirname, "../openapi.yaml");

const registry = new OpenAPIRegistry();

// Security scheme
registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

// Register reusable schemas
const ErrorResponseRef = registry.register("ErrorResponse", ErrorResponse);
const RegisterRequestRef = registry.register("RegisterRequest", RegisterRequestSchema);
const RegisterResponseRef = registry.register("RegisterResponse", RegisterResponseSchema);
const LoginRequestRef = registry.register("LoginRequest", LoginRequestSchema);
const LoginSuccessResponseRef = registry.register("LoginSuccessResponse", LoginSuccessResponseSchema);
const Login2FAResponseRef = registry.register("Login2FAResponse", Login2FAResponseSchema);
const TokenRefreshResponseRef = registry.register("TokenRefreshResponse", TokenRefreshResponseSchema);
const MeResponseRef = registry.register("MeResponse", MeResponseSchema);
const AddRoleRequestRef = registry.register("AddRoleRequest", AddRoleRequestSchema);
const PasswordResetRequestRef = registry.register("PasswordResetRequest", PasswordResetRequestSchema);
const PasswordResetConfirmRef = registry.register("PasswordResetConfirm", PasswordResetConfirmSchema);
const PasswordResetRequestResponseRef = registry.register(
  "PasswordResetRequestResponse",
  PasswordResetRequestResponseSchema
);
const TwoFASetupResponseRef = registry.register("TwoFASetupResponse", TwoFASetupResponseSchema);
const TwoFAVerifyRequestRef = registry.register("TwoFAVerifyRequest", TwoFAVerifyRequestSchema);
const TwoFADisableRequestRef = registry.register("TwoFADisableRequest", TwoFADisableRequestSchema);

// ─── Paths ────────────────────────────────────────────────────────────────────

const jsonBody = (schemaRef: ReturnType<OpenAPIRegistry["register"]>) => ({
  content: { "application/json": { schema: schemaRef } },
});

const errorResponse = (description: string) => ({
  description,
  ...jsonBody(ErrorResponseRef),
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/register",
  summary: "Register a new user",
  description:
    "Creates a new user account and sets an httpOnly refresh-token cookie. " +
    "Returns the same shape whether or not the email is already taken " +
    "(email enumeration prevention).",
  tags: ["Auth"],
  request: { body: jsonBody(RegisterRequestRef) },
  responses: {
    201: { description: "Registered", ...jsonBody(RegisterResponseRef) },
    400: errorResponse("Validation error or weak password"),
    429: errorResponse("Rate limit exceeded (10 / hour / IP)"),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/login",
  summary: "Log in with email + password",
  description:
    "Returns either an access token (no 2FA) or a short-lived 2FA challenge token. " +
    "Sets the refresh-token cookie on successful full login.",
  tags: ["Auth"],
  request: { body: jsonBody(LoginRequestRef) },
  responses: {
    200: {
      description: "Logged in (or 2FA required)",
      content: {
        "application/json": {
          schema: { oneOf: [LoginSuccessResponseRef, Login2FAResponseRef] },
        },
      },
    },
    400: errorResponse("Validation error"),
    401: errorResponse("Invalid credentials"),
    429: errorResponse("Rate limit exceeded (5 / 15 min / IP)"),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/refresh",
  summary: "Rotate refresh token and issue new access token",
  description:
    "Reads the opaque refresh token from the `refresh_token` cookie, rotates it " +
    "(old token is revoked, new one set in the cookie), and returns a new access " +
    "token. Replaying a revoked refresh token revokes ALL sessions for the user.",
  tags: ["Auth"],
  responses: {
    200: { description: "New access token issued", ...jsonBody(TokenRefreshResponseRef) },
    401: errorResponse("Refresh token missing, invalid, expired, or replayed"),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/logout",
  summary: "Log out the current session",
  tags: ["Auth"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Logged out",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }).openapi("LogoutResponse"),
        },
      },
    },
    401: errorResponse("Missing or invalid access token"),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/2fa/setup",
  summary: "Start TOTP 2FA setup",
  description: "Generates a TOTP secret, a QR-code data URL, and backup codes.",
  tags: ["2FA"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "Setup payload", ...jsonBody(TwoFASetupResponseRef) },
    401: errorResponse("Missing or invalid access token"),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/2fa/verify",
  summary: "Verify a TOTP code",
  description:
    "Two modes: (1) with a `challengeToken` from /login (exchanges for an access token), " +
    "(2) authed with an access token (confirms setup).",
  tags: ["2FA"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z
            .object({
              code: z.string().length(6),
              challengeToken: z.string().optional(),
            })
            .openapi("TwoFAVerifyWithChallenge"),
        },
      },
    },
  },
  responses: {
    200: { description: "Verified or access token issued" },
    400: errorResponse("Validation error"),
    401: errorResponse("Invalid code or challenge"),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/2fa/disable",
  summary: "Disable 2FA",
  description: "Requires a current password + TOTP code.",
  tags: ["2FA"],
  security: [{ bearerAuth: [] }],
  request: { body: jsonBody(TwoFADisableRequestRef) },
  responses: {
    200: { description: "2FA disabled" },
    401: errorResponse("Invalid code or password"),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/password/reset/request",
  summary: "Request a password reset email",
  description: "Always returns 200 regardless of whether the email exists.",
  tags: ["Password"],
  request: { body: jsonBody(PasswordResetRequestRef) },
  responses: {
    200: { description: "Reset request accepted", ...jsonBody(PasswordResetRequestResponseRef) },
    429: errorResponse("Rate limit exceeded (5 / 15 min / IP)"),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/password/reset/confirm",
  summary: "Confirm a password reset with a token",
  tags: ["Password"],
  request: { body: jsonBody(PasswordResetConfirmRef) },
  responses: {
    200: { description: "Password reset" },
    400: errorResponse("Invalid or expired token, or weak new password"),
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/me",
  summary: "Get the current user's profile, roles, and active sessions",
  tags: ["Me"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "User profile", ...jsonBody(MeResponseRef) },
    401: errorResponse("Missing or invalid access token"),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/me/roles",
  summary: "Add a role to the current user",
  description:
    "CUSTOMER and CANDIDATE roles auto-activate. CRM, SRM, MSME, INTERVIEWER " +
    "roles start as PENDING_VERIFICATION.",
  tags: ["Me"],
  security: [{ bearerAuth: [] }],
  request: { body: jsonBody(AddRoleRequestRef) },
  responses: {
    201: { description: "Role added" },
    400: errorResponse("Invalid role type"),
    401: errorResponse("Missing or invalid access token"),
  },
});

for (const provider of ["google", "linkedin"] as const) {
  registry.registerPath({
    method: "get",
    path: `/api/v1/auth/oauth/${provider}/start`,
    summary: `Start ${provider} OAuth flow`,
    tags: ["OAuth"],
    request: {
      query: z.object({
        returnTo: z.string().url().optional(),
      }),
    },
    responses: {
      302: { description: "Redirect to provider" },
      500: errorResponse("Provider not configured"),
    },
  });
  registry.registerPath({
    method: "get",
    path: `/api/v1/auth/oauth/${provider}/callback`,
    summary: `Handle ${provider} OAuth callback`,
    tags: ["OAuth"],
    request: {
      query: z.object({
        code: z.string(),
        state: z.string(),
      }),
    },
    responses: {
      302: { description: "Redirect to frontend with result" },
      400: errorResponse("Missing or invalid callback params"),
      401: errorResponse("OAuth exchange failed"),
    },
  });
}

registry.registerPath({
  method: "get",
  path: "/health",
  summary: "Health check",
  tags: ["System"],
  responses: {
    200: {
      description: "Healthy",
      content: {
        "application/json": {
          schema: z
            .object({
              status: z.literal("ok"),
              service: z.string(),
              version: z.string(),
            })
            .openapi("HealthResponse"),
        },
      },
    },
  },
});

// ─── Generate ─────────────────────────────────────────────────────────────────

const generator = new OpenApiGeneratorV3(registry.definitions);
const document = generator.generateDocument({
  openapi: "3.0.3",
  info: {
    title: "Techorbit Identity Service",
    version: "0.1.0",
    description:
      "Authentication, session management, 2FA, password reset, OAuth, and user-role " +
      "management for the Techorbit platform.",
  },
  servers: [
    { url: "http://localhost:3002", description: "Local dev" },
  ],
});

// Round-trip through JSON to strip any non-serializable leftovers (Zod effects,
// .refine callbacks, etc.) before YAML serialization.
const serializable = JSON.parse(JSON.stringify(document));
writeFileSync(OUTPUT_PATH, stringify(serializable));
// eslint-disable-next-line no-console
console.log(`wrote ${OUTPUT_PATH}`);
