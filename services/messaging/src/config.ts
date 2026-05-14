import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(3010),
  SERVICE_NAME: z.string().default("messaging"),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
  DATABASE_URL: z.string(),
  RABBITMQ_URL: z.string().optional(),
  JWT_PUBLIC_KEY: z.string(),
  JWT_PRIVATE_KEY: z.string(),
  ALLOWED_ORIGINS: z.string().optional(),
  // Upstreams for thread-participant resolution
  PLACEMENT_SVC_URL: z.string().default("http://localhost:3008"),
  REQUIREMENT_SVC_URL: z.string().default("http://localhost:3005"),
  MATCHING_SVC_URL: z.string().default("http://localhost:3006"),
  // Sprint 12 cleanup — interview-svc removed; URL is optional. Legacy
  // INTERVIEW-context threads fall back to caller-only participants.
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
