/**
 * Vitest globalSetup for identity-svc integration tests.
 *
 * Runs exactly once for the whole run: starts a Postgres testcontainer,
 * applies the Prisma schema via `prisma db push`, generates an RSA keypair
 * for JWT signing, and exports everything via env vars.
 *
 * If Docker is not available we set DOCKER_AVAILABLE=0 and every test file
 * skips its integration block — the run still exits 0 so `pnpm test` stays
 * green in docker-less environments.
 */
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVICE_ROOT = path.resolve(__dirname, "../..");

let container: StartedPostgreSqlContainer | undefined;

async function dockerAvailable(): Promise<boolean> {
  try {
    execSync("docker info", { stdio: "ignore", timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

export async function setup(): Promise<void> {
  // Always set JWT keys so unit-level tests that don't need docker still work.
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  process.env.JWT_PRIVATE_KEY = privateKey;
  process.env.JWT_PUBLIC_KEY = publicKey;

  // Set field encryption key for tests
  const encryptionKey = Buffer.alloc(32, "test-encryption-key-32-bytes");
  process.env.FIELD_ENCRYPTION_KEK_V1 = encryptionKey.toString("base64");

  if (!(await dockerAvailable())) {
    process.env.DOCKER_AVAILABLE = "0";
    // eslint-disable-next-line no-console
    console.warn(
      "[integration-setup] Docker unavailable — integration tests will be skipped. Start Docker Desktop (or CI runner) to run them."
    );
    return;
  }

  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("identity_test")
    .withUsername("test")
    .withPassword("test")
    .start();

  const url = `postgresql://test:test@${container.getHost()}:${container.getMappedPort(5432)}/identity_test`;
  process.env.DATABASE_URL = url;
  process.env.DOCKER_AVAILABLE = "1";
  process.env.NODE_ENV = "development"; // password-reset logs plaintext token only in dev
  // Shared-server test files must not cross-pollute rate-limit buckets.
  // Tests that specifically check rate-limiting build their own Fastify
  // instance (see rate-limit.test.ts) with this flag cleared.
  process.env.DISABLE_RATE_LIMIT = "1";

  // Apply migrations to set up the schema.
  execSync("pnpm prisma migrate deploy", {
    cwd: SERVICE_ROOT,
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
}

export async function teardown(): Promise<void> {
  if (container) {
    await container.stop();
    container = undefined;
  }
}
