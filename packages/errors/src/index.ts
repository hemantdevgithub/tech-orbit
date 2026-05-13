import { z } from "zod";

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export interface AppErrorOptions {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): ErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      code: "NOT_FOUND",
      message,
      statusCode: 404,
      details,
    });
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      code: "VALIDATION_ERROR",
      message,
      statusCode: 400,
      details,
    });
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized", details?: Record<string, unknown>) {
    super({
      code: "UNAUTHORIZED",
      message,
      statusCode: 401,
      details,
    });
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden", details?: Record<string, unknown>) {
    super({
      code: "FORBIDDEN",
      message,
      statusCode: 403,
      details,
    });
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      code: "CONFLICT",
      message,
      statusCode: 409,
      details,
    });
    this.name = "ConflictError";
  }
}

export class InternalError extends AppError {
  constructor(message: string = "Internal server error", details?: Record<string, unknown>) {
    super({
      code: "INTERNAL_ERROR",
      message,
      statusCode: 500,
      details,
    });
    this.name = "InternalError";
  }
}

export function mapErrorToStatusCode(error: unknown): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  return 500;
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}