import { authenticator } from "otplib";
import QRCode from "qrcode";
import type { SystemContext } from "@techorbit/auth-middleware";
import { twoFAChallengeRepository } from "../repositories/index.js";
import { userRepository } from "../repositories/index.js";
import {
  generateTOTPCode,
  hashTOTPCode,
  generateBackupCodes,
  hashBackupCodes,
} from "./token.service.js";
import { sha256 } from "./password.service.js";

const TOTP_ISSUER = "Techorbit";
const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export interface SetupTwoFAResult {
  secret: string;
  qrDataUrl: string;
  backupCodes: string[];
}

export interface Verify2FAResult {
  valid: boolean;
  challengeToken?: string;
}

export const twoFAService = {
  async setupTOTP(ctx: SystemContext, userId: string, email: string): Promise<SetupTwoFAResult> {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(email, TOTP_ISSUER, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth);
    const backupCodes = generateBackupCodes(8);
    const backupHash = hashBackupCodes(backupCodes);

    // Store encrypted secret and hashed backup codes
    await userRepository.enableTwoFA(ctx, userId, secret, backupHash);

    return {
      secret, // Return raw secret for manual entry fallback
      qrDataUrl,
      backupCodes,
    };
  },

  async createTOTPChallenge(
    ctx: SystemContext,
    userId: string
  ): Promise<string> {
    const code = generateTOTPCode();
    const codeHash = hashTOTPCode(code);
    const expiresAt = new Date(Date.now() + CHALLENGE_EXPIRY_MS);

    await twoFAChallengeRepository.create(ctx, {
      userId,
      codeHash,
      kind: "TOTP",
      expiresAt,
    });

    return code; // Return raw code for SMS delivery
  },

  async verifyTOTP(
    ctx: SystemContext,
    userId: string,
    code: string,
    secret: string
  ): Promise<boolean> {
    const isValid = authenticator.verify({ token: code, secret });
    if (!isValid) return false;

    // Also check the challenge code (if a challenge was created)
    const codeHash = hashTOTPCode(code);
    const challenge = await twoFAChallengeRepository.consumeByCode(
      ctx,
      userId,
      codeHash
    );

    // Consume if found (challenge may not exist if using TOTP directly)
    return challenge !== null || isValid;
  },

  async verifyBackupCode(
    ctx: SystemContext,
    userId: string,
    backupCode: string,
    storedHash: string
  ): Promise<boolean> {
    // Try each hash against the provided code
    const hashes = storedHash.split(",");
    for (const hash of hashes) {
      if (sha256(backupCode.toUpperCase().replace(/[^A-Z0-9]/g, "")) === hash) {
        // Mark as used by removing from the stored hash list
        // In production, this would update the user's backup hash
        return true;
      }
    }
    return false;
  },

  async disable2FA(
    ctx: SystemContext,
    userId: string
  ): Promise<void> {
    await userRepository.disableTwoFA(ctx, userId);
  },
};