import * as jose from "jose";
import { randomBytes, createHash } from "crypto";

const JWT_ISSUER = "techorbit-identity";
const JWT_AUDIENCE = "techorbit-api";
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const REFRESH_TOKEN_BYTES = 64;
const CHALLENGE_TOKEN_TTL_SECONDS = 5 * 60; // 5 minutes

// RS256 keys — imported as KeyLike via jose.importPKCS8 / importSPKI so that
// jose can use them for sign/verify. PEMs stored in env may be "\n"-escaped;
// we normalize to real newlines before import.
let privateKey: jose.KeyLike | null = null;
let publicKey: jose.KeyLike | null = null;
let importPromise: Promise<void> | null = null;

function normalizePem(pem: string): string {
  return pem.replace(/\\n/g, "\n").trim();
}

export function setJwtKeys(privateKeyPem: string, publicKeyPem: string): void {
  const priv = normalizePem(privateKeyPem);
  const pub = normalizePem(publicKeyPem);
  // Reset and lazily import on first use.
  privateKey = null;
  publicKey = null;
  importPromise = (async () => {
    privateKey = await jose.importPKCS8(priv, "RS256");
    publicKey = await jose.importSPKI(pub, "RS256");
  })();
}

async function getPrivateKey(): Promise<jose.KeyLike> {
  if (importPromise) await importPromise;
  if (!privateKey) {
    throw new Error("JWT private key not initialized. Call setJwtKeys() first.");
  }
  return privateKey;
}

async function getPublicKey(): Promise<jose.KeyLike> {
  if (importPromise) await importPromise;
  if (!publicKey) {
    throw new Error("JWT public key not initialized. Call setJwtKeys() first.");
  }
  return publicKey;
}

// ─── Token generation ────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string; // userId
  sessionId: string;
  roles: string[];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export async function issueAccessToken(
  userId: string,
  sessionId: string,
  roles: string[]
): Promise<string> {
  const alg = "RS256";

  return new jose.SignJWT({ roles, sessionId })
    .setProtectedHeader({ alg })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS} seconds`)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setJti(crypto.randomUUID())
    .sign(await getPrivateKey());
}

// ─── 2FA Challenge token ─────────────────────────────────────────────────────

export async function issue2FAChallengeToken(userId: string): Promise<string> {
  return new jose.SignJWT({ purpose: "2fa_challenge" })
    .setProtectedHeader({ alg: "RS256", kid: "identity-key-1" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${CHALLENGE_TOKEN_TTL_SECONDS} seconds`)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .sign(await getPrivateKey());
}

export async function verifyAccessToken(token: string): Promise<jose.JWTPayload> {
  const { payload } = await jose.jwtVerify(token, await getPublicKey(), {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
  return payload;
}

export async function verify2FAChallengeToken(token: string): Promise<string | null> {
  try {
    const result = await jose.jwtVerify(token, await getPublicKey(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    const payload = result.payload;
    if (payload["purpose"] !== "2fa_challenge") return null;
    return payload.sub as string;
  } catch {
    return null;
  }
}

// ─── Refresh token (opaque, not JWT) ─────────────────────────────────────────

export function generateRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getRefreshTokenTTL(): number {
  return REFRESH_TOKEN_TTL_MS;
}

export function getRefreshTokenExpiresAt(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
}

// ─── Password reset token (opaque) ───────────────────────────────────────────

export function generatePasswordResetToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// ─── Timing-safe comparisons ─────────────────────────────────────────────────

export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    return false;
  }

  return bufA.equals(bufB);
}

// ─── 2FA code generation ─────────────────────────────────────────────────────

export function generateTOTPCode(): string {
  return randomBytes(3).readUInt16BE(0).toString().padStart(6, "0").slice(0, 6);
}

export function hashTOTPCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

// ─── Backup codes ────────────────────────────────────────────────────────────

export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () =>
    randomBytes(4).toString("base64url").slice(0, 8)
  );
}

export function hashBackupCodes(codes: string[]): string {
  return codes
    .map((code) => createHash("sha256").update(code).digest("hex"))
    .join(",");
}

// ─── Export constants ─────────────────────────────────────────────────────────

export const ACCESS_TOKEN_TTL = ACCESS_TOKEN_TTL_SECONDS;
export const REFRESH_TOKEN_TTL = REFRESH_TOKEN_TTL_MS;
export const CHALLENGE_TOKEN_TTL = CHALLENGE_TOKEN_TTL_SECONDS;
