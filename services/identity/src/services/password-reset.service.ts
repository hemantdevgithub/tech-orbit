import type { SystemContext } from "@techorbit/auth-middleware";
import {
  userRepository,
  passwordResetRepository,
  outboxRepository,
} from "../repositories/index.js";
import { hashPassword } from "./password.service.js";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
} from "./token.service.js";

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export const passwordResetService = {
  async requestReset(ctx: SystemContext, email: string): Promise<{ sent: boolean }> {
    const user = await userRepository.findByEmail(ctx, email);

    // Always return success to prevent email enumeration
    if (!user) {
      return { sent: true };
    }

    // Generate and store token
    const token = generatePasswordResetToken();
    const tokenHash = hashPasswordResetToken(token);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    await passwordResetRepository.create(ctx, {
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    // In production, send email via Mailpit/SendGrid
    // For now, log the token (dev only — never log tokens in prod)
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEV] Password reset token for ${email}: ${token}`);
    }

    return { sent: true };
  },

  async confirmReset(
    ctx: SystemContext,
    token: string,
    newPassword: string
  ): Promise<{ success: boolean }> {
    const tokenHash = hashPasswordResetToken(token);

    const resetRequest = await passwordResetRepository.consumeByToken(ctx, tokenHash);

    if (!resetRequest) {
      return { success: false };
    }

    const user = await userRepository.findByIdOrThrow(ctx, resetRequest.userId);

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await userRepository.updatePassword(ctx, user.id, { passwordHash: newPasswordHash });

    // Invalidate all other reset requests
    await passwordResetRepository.invalidateAllForUser(ctx, user.id);

    // Emit password changed event
    await outboxRepository.enqueue(ctx, {
      type: "user.password_changed.v1",
      payload: {
        userId: user.id,
      },
    });

    return { success: true };
  },
};