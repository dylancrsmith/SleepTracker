import type { Request, Response, NextFunction } from "express";

/** Standard HTTP error for controllers to throw. */
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "HttpError";
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

/** Convenience helpers for common HTTP errors */
export const BadRequest = (message = "Bad request") =>
  new HttpError(400, message, "BAD_REQUEST");
export const Unauthorized = (message = "Unauthorized") =>
  new HttpError(401, message, "UNAUTHORIZED");
export const Forbidden = (message = "Forbidden") =>
  new HttpError(403, message, "FORBIDDEN");
export const NotFound = (message = "Resource not found") =>
  new HttpError(404, message, "NOT_FOUND");
export const Conflict = (message = "Conflict") =>
  new HttpError(409, message, "CONFLICT");

interface ErrorResponse {
  message: string;
  code?: string;
  /** Only included in development for debugging */
  stack?: string;
}

/**
 * Global error handling middleware.
 *
 * Must be registered last (after all routes). Catches errors from:
 * - next(err) calls
 * - async handlers wrapped with asyncHandler()
 * Note: unwrapped async handlers that throw will NOT be caught (use asyncHandler).
 *
 * - HttpError: uses statusCode and message, returns code if present
 * - Errors with status/statusCode: treated as HTTP errors
 * - Unknown errors: 500, generic message in production, full details in development
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    return next(err);
  }

  const isDev = process.env.NODE_ENV !== "production";

  let statusCode = 500;
  let message = "Internal Server Error";
  let code: string | undefined;

  if (err instanceof HttpError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
  } else if (err && typeof err === "object" && ("statusCode" in err || "status" in err)) {
    statusCode = (err as { statusCode?: number; status?: number }).statusCode
      ?? (err as { statusCode?: number; status?: number }).status
      ?? 500;
    message = (err as { message?: string }).message ?? message;
  } else if (err instanceof Error) {
    message = isDev ? err.message : message;
  }

  const payload: ErrorResponse = { message };
  if (code) payload.code = code;
  if (isDev && err instanceof Error && err.stack) payload.stack = err.stack;

  if (statusCode >= 500) {
    console.error("[Error]", statusCode, err);
  } else {
    console.warn("[Error]", statusCode, message);
  }

  res.status(statusCode).json(payload);
}
