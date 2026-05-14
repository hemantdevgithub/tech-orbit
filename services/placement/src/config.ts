import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(3008),
  SERVICE_NAME: z.string().default("placement"),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
  DATABASE_URL: z.string(),
  RABBITMQ_URL: z.string().optional(),
  JWT_PUBLIC_KEY: z.string(),
  JWT_PRIVATE_KEY: z.string(),
  ALLOWED_ORIGINS: z.string().optional(),
  DISABLE_RATE_LIMIT: z.coerce.boolean().default(false),
  PROFILE_SVC_URL: z.string().default("http://localhost:3004"),
  REQUIREMENT_SVC_URL: z.string().default("http://localhost:3005"),
  MATCHING_SVC_URL: z.string().default("http://localhost:3006"),
  // Sprint 12 cleanup — interview-svc is removed; URL is optional. When
  // unset, placement-svc treats every submission as having no interviews
  // (interviews happen externally now).
  INTERVIEW_SVC_URL: z.string().optional(),
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
