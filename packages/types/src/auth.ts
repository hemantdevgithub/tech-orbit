import { z } from "zod";

// ─── Email & Password ────────────────────────────────────────────────────────

export const EmailSchema = z.string().email().toLowerCase().trim();

export const PasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .describe(
    "Password strength validated server-side with zxcvbn (score >= 3 required)"
  );

export type Email = z.infer<typeof EmailSchema>;
export type Password = z.infer<typeof PasswordSchema>;

// ─── Auth Request / Response Schemas ────────────────────────────────────────

export const RegisterRequestSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AuthSuccessResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal("Bearer"),
  expiresIn: z.number(),
  user: z.object({
    id: z.string().uuid(),
    email: EmailSchema,
    firstName: z.string(),
    lastName: z.string(),
    status: z.enum(["PENDING", "ACTIVE", "SUSPENDED"]),
    emailVerified: z.boolean(),
    has2FA: z.boolean(),
    roles: z.array(
      z.object({
        roleType: z.string(),
        status: z.enum(["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED"]),
        addedAt: z.string().datetime(),
      })
    ),
  }),
});

export type AuthSuccessResponse = z.infer<typeof AuthSuccessResponseSchema>;

export const PartialAuthResponseSchema = z.object({
  require2FA: z.literal(true),
  challengeToken: z.string(),
  expiresIn: z.number().describe("Seconds until 2FA challenge expires (5 min)"),
});

export type PartialAuthResponse = z.infer<typeof PartialAuthResponseSchema>;

export const RefreshRequestSchema = z.object({}).strict();

export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;

export const RefreshResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal("Bearer"),
  expiresIn: z.number(),
});

export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

// ─── Password Reset ───────────────────────────────────────────────────────────

export const PasswordResetRequestSchema = z.object({
  email: EmailSchema,
});

export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;

export const PasswordResetConfirmSchema = z.object({
  token: z.string().min(1),
  password: PasswordSchema,
});

export type PasswordResetConfirm = z.infer<typeof PasswordResetConfirmSchema>;

// ─── 2FA ─────────────────────────────────────────────────────────────────────

export const TwoFASetupResponseSchema = z.object({
  secret: z.string().describe("Base32 TOTP secret for authenticator apps"),
  qrDataUrl: z.string().url().describe("otpauth:// URI for QR code"),
  backupCodes: z.array(z.string()).length(8),
});

export type TwoFASetupResponse = z.infer<typeof TwoFASetupResponseSchema>;

export const TwoFAVerifyRequestSchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/, "Must be 6 digits"),
});

export type TwoFAVerifyRequest = z.infer<typeof TwoFAVerifyRequestSchema>;

export const TwoFADisableRequestSchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/),
  password: z.string().min(1),
});

export type TwoFADisableRequest = z.infer<typeof TwoFADisableRequestSchema>;

// ─── Role Management ──────────────────────────────────────────────────────────

export const AddRoleRequestSchema = z.object({
  roleType: z.enum(["CUSTOMER", "CANDIDATE", "CRM", "SRM", "MSME", "INTERVIEWER"]),
});

export type AddRoleRequest = z.infer<typeof AddRoleRequestSchema>;

// ─── Me / Session ────────────────────────────────────────────────────────────

export const MeResponseSchema = z.object({
  id: z.string().uuid(),
  email: EmailSchema,
  firstName: z.string(),
  lastName: z.string(),
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED"]),
  emailVerified: z.boolean(),
  has2FA: z.boolean(),
  roles: z.array(
    z.object({
      id: z.string().uuid(),
      roleType: z.string(),
      status: z.enum(["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED"]),
      addedAt: z.string().datetime(),
      verificationData: z.record(z.unknown()).optional(),
    })
  ),
  sessions: z.array(
    z.object({
      id: z.string().uuid(),
      userAgent: z.string().nullable(),
      ipAddress: z.string().nullable(),
      createdAt: z.string().datetime(),
      lastActiveAt: z.string().datetime(),
      current: z.boolean(),
    })
  ),
});

export type MeResponse = z.infer<typeof MeResponseSchema>;

// ─── API Response Types ────────────────────────────────────────────────────────

export const RegisterResponseSchema = z.object({
  message: z.string(),
  require2FA: z.boolean().optional(),
});

export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;

export const LoginSuccessResponseSchema = z.object({
  require2FA: z.literal(false),
  accessToken: z.string(),
  tokenType: z.literal("Bearer"),
  expiresIn: z.number(),
});

export type LoginSuccessResponse = z.infer<typeof LoginSuccessResponseSchema>;

export const Login2FAResponseSchema = z.object({
  require2FA: z.literal(true),
  challengeToken: z.string(),
  expiresIn: z.number(),
});

export type Login2FAResponse = z.infer<typeof Login2FAResponseSchema>;

export const LoginResponseSchema = z.discriminatedUnion("require2FA", [
  LoginSuccessResponseSchema,
  Login2FAResponseSchema,
]);

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const TokenRefreshResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal("Bearer"),
  expiresIn: z.number(),
});

export type TokenRefreshResponse = z.infer<typeof TokenRefreshResponseSchema>;

export const PasswordResetRequestResponseSchema = z.object({
  message: z.string(),
});

export type PasswordResetRequestResponse = z.infer<typeof PasswordResetRequestResponseSchema>;

export const UserProfileSchema = MeResponseSchema;

export type UserProfile = z.infer<typeof UserProfileSchema>;

// ─── OAuth ───────────────────────────────────────────────────────────────────

export const OAuthStartResponseSchema = z.object({
  url: z.string().url(),
});

export type OAuthStartResponse = z.infer<typeof OAuthStartResponseSchema>;

// ─── Audit Event Schemas ─────────────────────────────────────────────────────

export const UserRegisteredEventSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("user.registered.v1"),
  version: z.literal("1.0.0"),
  timestamp: z.string().datetime(),
  source: z.string(),
  correlationId: z.string().uuid().optional(),
  payload: z.object({
    userId: z.string().uuid(),
    email: EmailSchema,
    roleType: z.string().optional(),
    method: z.enum(["EMAIL", "GOOGLE", "LINKEDIN"]),
  }),
});

export type UserRegisteredEvent = z.infer<typeof UserRegisteredEventSchema>;

export const UserLoggedInEventSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("user.logged_in.v1"),
  version: z.literal("1.0.0"),
  timestamp: z.string().datetime(),
  source: z.string(),
  correlationId: z.string().uuid().optional(),
  payload: z.object({
    userId: z.string().uuid(),
    sessionId: z.string().uuid(),
    method: z.enum(["EMAIL", "GOOGLE", "LINKEDIN"]),
    has2FA: z.boolean(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
  }),
});

export type UserLoggedInEvent = z.infer<typeof UserLoggedInEventSchema>;

export const UserRoleAddedEventSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("user.role_added.v1"),
  version: z.literal("1.0.0"),
  timestamp: z.string().datetime(),
  source: z.string(),
  correlationId: z.string().uuid().optional(),
  payload: z.object({
    userId: z.string().uuid(),
    roleId: z.string().uuid(),
    roleType: z.string(),
    initialStatus: z.enum(["PENDING_VERIFICATION", "ACTIVE"]),
  }),
});

export type UserRoleAddedEvent = z.infer<typeof UserRoleAddedEventSchema>;

export const PasswordChangedEventSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("user.password_changed.v1"),
  version: z.literal("1.0.0"),
  timestamp: z.string().datetime(),
  source: z.string(),
  correlationId: z.string().uuid().optional(),
  payload: z.object({
    userId: z.string().uuid(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
  }),
});

export type PasswordChangedEvent = z.infer<typeof PasswordChangedEventSchema>;

export const SessionRevokedEventSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("session.revoked.v1"),
  version: z.literal("1.0.0"),
  timestamp: z.string().datetime(),
  source: z.string(),
  correlationId: z.string().uuid().optional(),
  payload: z.object({
    userId: z.string().uuid(),
    sessionId: z.string().uuid(),
    reason: z.enum(["USER_LOGOUT", "ADMIN_REVOCATION", "REPLAY_DETECTED", "EXPIRED"]),
    revokedAt: z.string().datetime(),
  }),
});

export type SessionRevokedEvent = z.infer<typeof SessionRevokedEventSchema>;

export const User2FAEnabledEventSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("user.2fa_enabled.v1"),
  version: z.literal("1.0.0"),
  timestamp: z.string().datetime(),
  source: z.string(),
  correlationId: z.string().uuid().optional(),
  payload: z.object({
    userId: z.string().uuid(),
    method: z.enum(["TOTP", "SMS"]),
  }),
});

export type User2FAEnabledEvent = z.infer<typeof User2FAEnabledEventSchema>;

export const User2FADisabledEventSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("user.2fa_disabled.v1"),
  version: z.literal("1.0.0"),
  timestamp: z.string().datetime(),
  source: z.string(),
  correlationId: z.string().uuid().optional(),
  payload: z.object({
    userId: z.string().uuid(),
  }),
});

export type User2FADisabledEvent = z.infer<typeof User2FADisabledEventSchema>;
