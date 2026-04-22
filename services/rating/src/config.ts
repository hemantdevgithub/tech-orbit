import { z } from "zod";

export const configSchema = z.object({
  PORT: z.coerce.number().int().min(1).max.default,
  SERVICE_NAME: z.string().default("rating"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  RABBITMQ_URL: z.string().url().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
});

export type Config = z.infer<typeof configSchema>;

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (cachedConfig) return cachedConfig;

  const env = {
    PORT: process.env.PORT,
    SERVICE_NAME: process.env.SERVICE_NAME,
    LOG_LEVEL: process.env.LOG_LEVEL,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    RABBITMQ_URL: process.env.RABBITMQ_URL,
    JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY,
  };

  cachedConfig = configSchema.parse(env);
  return cachedConfig;
}

export function clearConfigCache(): void {
  cachedConfig = null;
}
