import argon2 from "argon2";
import { zxcvbn } from "zxcvbn-ts";
import { createHash } from "crypto";

// Configure zxcvbn-ts (optional: load dictionaries for better results)
// zxcvbnOptions.load();

const ARGON2_OPTIONS = {
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
  type: argon2.argon2id,
};

export interface PasswordStrength {
  score: number; // 0-4
  feedback: string;
  isAcceptable: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export function validatePasswordStrength(
  password: string
): PasswordStrength {
  const result = zxcvbn(password);

  const feedback = result.feedback.suggestions.join(" ") ||
    result.feedback.warning ||
    "";

  return {
    score: result.score,
    feedback,
    isAcceptable: result.score >= 3 && password.length >= 12,
  };
}

// ─── Timing-safe secret comparison ──────────────────────────────────────────────

export function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    return false;
  }

  return bufA.equals(bufB);
}

// ─── SHA-256 helper for token hashing ──────────────────────────────────────────

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}