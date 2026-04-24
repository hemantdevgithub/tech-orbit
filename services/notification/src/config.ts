import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(3011),
  SERVICE_NAME: z.string().default("notification"),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
  DATABASE_URL: z.string(),
  RABBITMQ_URL: z.string().optional(),
  JWT_PUBLIC_KEY: z.string(),
  ALLOWED_ORIGINS: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  EMAIL_FROM: z.string().default("no-reply@techorbit.test"),
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
