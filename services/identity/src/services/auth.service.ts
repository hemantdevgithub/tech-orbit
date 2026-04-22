import type { SystemContext } from "@techorbit/auth-middleware";
import {
  userRepository,
  sessionRepository,
  outboxRepository,
} from "../repositories/index.js";
import { hashPassword, verifyPassword } from "./password.service.js";
import {
  issueAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  getRefreshTokenExpiresAt,
  issue2FAChallengeToken,
  verify2FAChallengeToken,
  ACCESS_TOKEN_TTL,
  CHALLENGE_TOKEN_TTL,
} from "./token.service.js";

export interface RegisterResult {
  userId: string;
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
  requires2FA?: boolean;
  challengeToken?: string;
  expiresIn?: number;
}

export interface LoginResult {
  userId: string;
  sessionId: string;
  accessToken?: string;
  refreshToken?: string;
  requires2FA?: boolean;
  challengeToken?: string;
  expiresIn: number;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    emailVerified: boolean;
    has2FA: boolean;
    roles: Array<{ roleType: string; status: string; addedAt: Date }>;
  };
}

export const authService = {
  async register(
    ctx: SystemContext,
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<RegisterResult> {
    // Check if email already exists
    const existing = await userRepository.findByEmail(ctx, email);
    if (existing) {
      // For email enumeration prevention, we return success anyway
      // but don't create a new account. The same response pattern is used.
      return { userId: existing.id, requires2FA: existing.has2FA };
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await userRepository.create(ctx, {
      email,
      passwordHash,
      firstName,
      lastName,
    });

    // Emit user.registered event
    await outboxRepository.enqueue(ctx, {
      type: "user.registered.v1",
      payload: {
        userId: user.id,
        email,
        method: "EMAIL",
      },
    });

    // If user has 2FA enabled (unlikely on registration but possible), return challenge
    if (user.has2FA) {
      const challengeToken = await issue2FAChallengeToken(user.id);
      return { userId: user.id, requires2FA: true, challengeToken };
    }

    // Create session
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const expiresAt = getRefreshTokenExpiresAt();

    const session = await sessionRepository.create(ctx, {
      userId: user.id,
      refreshTokenHash,
      userAgent,
      ipAddress,
      expiresAt,
    });

    // Issue access token
    const accessToken = await issueAccessToken(user.id, session.id, []);

    return {
      userId: user.id,
      accessToken,
      refreshToken,
      sessionId: session.id,
      expiresIn: ACCESS_TOKEN_TTL,
    };
  },

  async login(
    ctx: SystemContext,
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResult> {
    const user = await userRepository.findByEmail(ctx, email);

    // Always return the same error for non-existent user and wrong password
    // This prevents email enumeration
    if (!user || !user.passwordHash) {
      return {
        userId: "",
        sessionId: "",
        expiresIn: 0,
      };
    }

    const passwordValid = await verifyPassword(
      user.passwordHash,
      password
    );

    if (!passwordValid) {
      // Emit failed login event (could add later)
      return {
        userId: "",
        sessionId: "",
        expiresIn: 0,
      };
    }

    // Check if user is suspended
    if (user.status === "SUSPENDED") {
      return {
        userId: "",
        sessionId: "",
        expiresIn: 0,
      };
    }

    // If 2FA is enabled, return partial auth
    if (user.has2FA) {
      const challengeToken = await issue2FAChallengeToken(user.id);
      return {
        userId: user.id,
        sessionId: "",
        requires2FA: true,
        challengeToken,
        expiresIn: CHALLENGE_TOKEN_TTL,
      };
    }

    // Create session
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const expiresAt = getRefreshTokenExpiresAt();

    const session = await sessionRepository.create(ctx, {
      userId: user.id,
      refreshTokenHash,
      userAgent,
      ipAddress,
      expiresAt,
    });

    // Emit logged_in event
    await outboxRepository.enqueue(ctx, {
      type: "user.logged_in.v1",
      payload: {
        userId: user.id,
        sessionId: session.id,
        method: "EMAIL",
        has2FA: user.has2FA,
        ipAddress,
        userAgent,
      },
    });

    // Issue access token
    const accessToken = await issueAccessToken(user.id, session.id, []);

    return {
      userId: user.id,
      sessionId: session.id,
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL,
    };
  },

  async verify2FAAndLogin(
    ctx: SystemContext,
    userId: string,
    sessionId: string,
    challengeToken: string
  ): Promise<LoginResult> {
    // Verify the challenge token
    const tokenUserId = await verify2FAChallengeToken(challengeToken);
    if (!tokenUserId || tokenUserId !== userId) {
      throw new Error("Invalid 2FA challenge token");
    }

    const user = await userRepository.findByIdOrThrow(ctx, userId);

    // Create session
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const expiresAt = getRefreshTokenExpiresAt();

    const session = await sessionRepository.create(ctx, {
      userId: user.id,
      refreshTokenHash,
      expiresAt,
    });

    // Emit logged_in event
    await outboxRepository.enqueue(ctx, {
      type: "user.logged_in.v1",
      payload: {
        userId: user.id,
        sessionId: session.id,
        method: "EMAIL",
        has2FA: true,
      },
    });

    const accessToken = await issueAccessToken(user.id, session.id, []);

    return {
      userId: user.id,
      sessionId: session.id,
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL,
    };
  },

  async refreshSession(
    ctx: SystemContext,
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string; sessionId: string; expiresIn: number }> {
    const hash = hashRefreshToken(refreshToken);
    const session = await sessionRepository.findByRefreshTokenHash(ctx, hash);

    if (!session) {
      throw new Error("Invalid refresh token");
    }

    // Check if session is expired or revoked
    if (session.expiresAt < new Date()) {
      throw new Error("Refresh token expired");
    }

    if (session.revokedAt) {
      // REPLAY DETECTED — revoke all sessions for this user
      await sessionRepository.revokeAllForUser(ctx, session.userId, "REPLAY_DETECTED");

      // Emit session.revoked event
      await outboxRepository.enqueue(ctx, {
        type: "session.revoked.v1",
        payload: {
          userId: session.userId,
          sessionId: session.id,
          reason: "REPLAY_DETECTED",
          revokedAt: new Date().toISOString(),
        },
      });

      throw new Error("Session replay detected — all sessions revoked");
    }

    // Get user for roles
    const user = await userRepository.findByIdOrThrow(ctx, session.userId);
    const roles = user.roles.map((r) => r.roleType);

    // Rotate refresh token
    const newRefreshToken = generateRefreshToken();
    const newHash = hashRefreshToken(newRefreshToken);
    const newExpiresAt = getRefreshTokenExpiresAt();

    const newSession = await sessionRepository.rotate(ctx, {
      sessionId: session.id,
      userId: session.userId,
      newRefreshTokenHash: newHash,
      newExpiresAt,
    });

    const accessToken = await issueAccessToken(user.id, newSession.id, roles);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      sessionId: newSession.id,
      expiresIn: ACCESS_TOKEN_TTL,
    };
  },

  async logout(
    ctx: SystemContext,
    sessionId: string,
    userId: string
  ): Promise<void> {
    await sessionRepository.revokeById(ctx, sessionId, "USER_LOGOUT");

    await outboxRepository.enqueue(ctx, {
      type: "session.revoked.v1",
      payload: {
        userId,
        sessionId,
        reason: "USER_LOGOUT",
        revokedAt: new Date().toISOString(),
      },
    });
  },

  async getMe(
    ctx: SystemContext,
    userId: string
  ): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    emailVerified: boolean;
    has2FA: boolean;
    roles: Array<{ id: string; roleType: string; status: string; addedAt: Date; verificationData: unknown }>;
    sessions: Array<{ id: string; userAgent: string | null; ipAddress: string | null; createdAt: Date; lastActiveAt: Date; current: boolean }>;
  }> {
    const user = await userRepository.findByIdOrThrow(ctx, userId);

    const activeSessions = await sessionRepository.findActiveForUser(ctx, userId);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      emailVerified: user.emailVerified,
      has2FA: user.has2FA,
      roles: user.roles.map((r) => ({
        id: r.id,
        roleType: r.roleType,
        status: r.status,
        addedAt: r.createdAt,
        verificationData: r.verificationData,
      })),
      sessions: activeSessions.map((s, i) => ({
        id: s.id,
        userAgent: s.userAgent,
        ipAddress: s.ipAddress,
        createdAt: s.createdAt,
        lastActiveAt: s.lastActiveAt,
        current: i === 0,
      })),
    };
  },
};