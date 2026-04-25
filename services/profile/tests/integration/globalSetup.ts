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
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  process.env.JWT_PUBLIC_KEY = publicKey;
  process.env.JWT_PRIVATE_KEY_TEST = privateKey; // exposed for test token signing
  // profile-svc signs service-to-service tokens (e.g. calls to interview-svc
  // when resolving featured interviews). Tests stub the HTTP fetch itself,
  // but the private key still has to be loadable during server boot.
  process.env.JWT_PRIVATE_KEY = privateKey;
  process.env.INTERVIEW_SVC_URL = "http://interview-svc.test";

  const encryptionKey = Buffer.alloc(32, "test-profile-enc-key-32-bytes!!!");
  process.env.FIELD_ENCRYPTION_KEK_V1 = encryptionKey.toString("base64");
  process.env.DISABLE_RATE_LIMIT = "1";

  if (!(await dockerAvailable())) {
    process.env.DOCKER_AVAILABLE = "0";
    // eslint-disable-next-line no-console
    console.warn("[profile-setup] Docker unavailable — integration tests will be skipped.");
    return;
  }

  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("profile_test")
    .withUsername("test")
    .withPassword("test")
    .start();

  const url = `postgresql://test:test@${container.getHost()}:${container.getMappedPort(5432)}/profile_test`;
  process.env.DATABASE_URL = url;
  process.env.DOCKER_AVAILABLE = "1";

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
