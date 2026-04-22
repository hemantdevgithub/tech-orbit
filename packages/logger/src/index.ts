import pino from "pino";

export interface LoggerOptions {
  name: string;
  level?: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
}

export interface LogContext {
  correlationId?: string;
  userId?: string;
  [key: string]: unknown;
}

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