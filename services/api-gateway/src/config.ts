import { z } from "zod";

const routeSchema = z.object({
  upstream: z.string().url(),
  prefix: z.string().startsWith("/"),
});

export const configSchema = z.object({
  PORT: z.coerce.number().int().default(0),
  SERVICE_NAME: z.string().default("api-gateway"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  RABBITMQ_URL: z.string().url().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  ROUTES: z.string().optional(),
});

export type Config = z.infer<typeof configSchema>;

function parseRoutes(env: string | undefined): Record<string, { upstream: string; prefix: string }> {
  if (!env) return {};
  try {
    const routes = JSON.parse(env) as unknown[];
    const parsed: Record<string, { upstream: string; prefix: string }> = {};
    for (const route of routes) {
      const parsedRoute = routeSchema.parse(route);
      const key = parsedRoute.prefix.replace(/\/$/, "") || "/";
      parsed[key] = { upstream: parsedRoute.upstream, prefix: parsedRoute.prefix };
    }
    return parsed;
  } catch {
    return {};
  }
}

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
    ROUTES: process.env.ROUTES,
  };

  cachedConfig = configSchema.parse(env);
  return cachedConfig;
}

export function getRoutes(): Record<string, { upstream: string; prefix: string }> {
  const config = getConfig();
  return parseRoutes(config.ROUTES ?? process.env.ROUTES);
}

export function clearConfigCache(): void {
  cachedConfig = null;
}
