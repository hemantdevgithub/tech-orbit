import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(3004),
  SERVICE_NAME: z.string().default("profile-svc"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  DATABASE_URL: z.string(),
  RABBITMQ_URL: z.string().optional(),
  JWT_PUBLIC_KEY: z.string(),
  ALLOWED_ORIGINS: z.string().optional(),
  FIELD_ENCRYPTION_KEK_V1: z.string().optional(),
  DISABLE_RATE_LIMIT: z.coerce.boolean().default(false),
});

export type Config = z.infer<typeof configSchema>;

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (cachedConfig) return cachedConfig;
  cachedConfig = configSchema.parse(process.env);
  return cachedConfig;
}

export function clearConfigCache(): void {
  cachedConfig = null;
}
