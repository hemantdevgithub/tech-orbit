import * as jose from "jose";

const JWT_ISSUER = "techorbit-interview";
const JWT_AUDIENCE = "techorbit-api";
const TOKEN_TTL_SECONDS = 5 * 60;
const REFRESH_BUFFER_MS = 60 * 1000;
const SERVICE_USER_ID = "00000000-0000-0000-0000-000000000000";

type TokenState = { token: string; expiresAtMs: number };

export type ServiceTokenSigner = { getToken(): Promise<string> };

export function createServiceTokenSigner(
  privateKeyPem: string,
  serviceName: string,
): ServiceTokenSigner {
  const pem = privateKeyPem.replace(/\\n/g, "\n").trim();
  let cached: TokenState | null = null;
  let importPromise: Promise<jose.KeyLike> | null = null;

  async function getKey(): Promise<jose.KeyLike> {
    if (!importPromise) importPromise = jose.importPKCS8(pem, "RS256");
    return importPromise;
  }

  async function sign(): Promise<TokenState> {
    const key = await getKey();
    const token = await new jose.SignJWT({ roles: ["SERVICE"], sessionId: crypto.randomUUID(), service: serviceName })
      .setProtectedHeader({ alg: "RS256" })
      .setSubject(SERVICE_USER_ID)
      .setIssuedAt()
      .setExpirationTime(`${TOKEN_TTL_SECONDS} seconds`)
      .setIssuer(JWT_ISSUER)
      .setAudience(JWT_AUDIENCE)
      .setJti(crypto.randomUUID())
      .sign(key);
    return { token, expiresAtMs: Date.now() + TOKEN_TTL_SECONDS * 1000 };
  }

  return {
    async getToken(): Promise<string> {
      if (cached && cached.expiresAtMs - Date.now() > REFRESH_BUFFER_MS) return cached.token;
      cached = await sign();
      return cached.token;
    },
  };
}
