import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(3005),
  SERVICE_NAME: z.string().default("requirement-svc"),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
  DATABASE_URL: z.string(),
  RABBITMQ_URL: z.string().optional(),
  JWT_PUBLIC_KEY: z.string(),
  ALLOWED_ORIGINS: z.string().optional(),
  DISABLE_RATE_LIMIT: z.coerce.boolean().default(false),
  // Base URL of profile-svc — used by the service layer when auto-attributing
  // a CRM based on CustomerCompanyProfile.attributedCrmUserId.
  PROFILE_SVC_URL: z.string().default("http://localhost:3004"),
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
