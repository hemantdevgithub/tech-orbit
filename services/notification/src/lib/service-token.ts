import * as jose from "jose";

// Service-to-service auth.  matching-svc holds the RS256 private key and
// self-mints a short-lived JWT with roles = ["SERVICE"].  Profile-svc and
// requirement-svc verify with the shared public key and gate their
// "internal" endpoints on that role.
//
// Trade-off: the private key lives in matching-svc as well as identity-svc.
// Known tech-debt; AWS KMS-backed signing is the proper fix.

const JWT_ISSUER = "techorbit-notification";
const JWT_AUDIENCE = "techorbit-api";
const TOKEN_TTL_SECONDS = 5 * 60; // 5 minutes — always refresh a minute early
const REFRESH_BUFFER_MS = 60 * 1000;

// Nil UUID — auth-middleware requires `sub` to parse as UUID.  Using the
// nil UUID makes service calls unambiguous when they land in logs.
const SERVICE_USER_ID = "00000000-0000-0000-0000-000000000000";

type TokenState = {
  token: string;
  expiresAtMs: number;
};

export type ServiceTokenSigner = {
  getToken(): Promise<string>;
};

export function createServiceTokenSigner(
  privateKeyPem: string,
  serviceName: string,
): ServiceTokenSigner {
  const pem = privateKeyPem.replace(/\\n/g, "\n").trim();
  let cached: TokenState | null = null;
  let importPromise: Promise<jose.KeyLike> | null = null;

  async function getKey(): Promise<jose.KeyLike> {
    if (!importPromise) {
      importPromise = jose.importPKCS8(pem, "RS256");
    }
    return importPromise;
  }

  async function sign(): Promise<TokenState> {
    const key = await getKey();
    const sessionId = crypto.randomUUID();
    const token = await new jose.SignJWT({
      roles: ["SERVICE"],
      sessionId,
      service: serviceName,
    })
      .setProtectedHeader({ alg: "RS256" })
      .setSubject(SERVICE_USER_ID)
      .setIssuedAt()
      .setExpirationTime(`${TOKEN_TTL_SECONDS} seconds`)
      .setIssuer(JWT_ISSUER)
      .setAudience(JWT_AUDIENCE)
      .setJti(crypto.randomUUID())
      .sign(key);
    return {
      token,
      expiresAtMs: Date.now() + TOKEN_TTL_SECONDS * 1000,
    };
  }

  return {
    async getToken(): Promise<string> {
      if (cached && cached.expiresAtMs - Date.now() > REFRESH_BUFFER_MS) {
        return cached.token;
      }
      cached = await sign();
      return cached.token;
    },
  };
}
