import pino from "pino";
import type { pinoHttp } from "pino-http";

export interface LoggerOptions {
  name: string;
  level?: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
}

export interface LogContext {
  correlationId?: string;
  userId?: string;
  [key: string]: unknown;
}

const CORRELATION_ID_HEADER = "x-correlation-id";

export function createLogger(options: LoggerOptions): pino.Logger {
  return pino({
    name: options.name,
    level: options.level ?? "info",
    base: {
      service: options.name,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

export function createRequestLogger(
  logger: pino.Logger
): typeof pinoHttp {
  const pinoHttpModule = require("pino-http") as typeof pinoHttp;
  return pinoHttpModule({
    logger,
    customCorrelationId: (req: { headers: Record<string, string | string[] | undefined> }) => {
      return req.headers[CORRELATION_ID_HEADER] ?? crypto.randomUUID();
    },
    customLogLevel: (_req: unknown, res: { statusCode: number }) => {
      if (res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    customSuccessMessage: (_req: unknown, res: { statusCode: number }) => {
      return `Request completed with status ${res.statusCode}`;
    },
    customErrorMessage: (_req: unknown, res: { statusCode: number }) => {
      return `Request failed with status ${res.statusCode}`;
    },
    serializers: {
      req: (req: { headers: Record<string, string | string[] | undefined> }) => {
        const headers = { ...req.headers };
        delete headers["authorization"];
        delete headers["cookie"];
        return {
          method: (req as { method: string }).method,
          url: (req as { url: string }).url,
          headers,
        };
      },
      res: (res: { statusCode: number }) => ({
        statusCode: res.statusCode,
      }),
      err: pino.stdSerializers.err,
    },
  });
}

export function withContext(
  logger: pino.Logger,
  context: LogContext
): pino.Logger {
  return logger.child(context);
}

export function redactSecrets(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    "password",
    "token",
    "secret",
    "authorization",
    "cookie",
    "ssn",
    "ein",
    "bankAccount",
    "refreshToken",
  ];

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      result[key] = redactSecrets(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}