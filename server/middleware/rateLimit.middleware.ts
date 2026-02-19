import type { Request, Response, NextFunction } from "express";

/**
 * In-memory store for rate limit tracking.
 * Key: client identifier (IP), Value: { count, resetAt }
 */
const store = new Map<string, { count: number; resetAt: number }>();

/** Clean up expired entries periodically to prevent memory bloat */
const CLEANUP_INTERVAL_MS = 60_000;
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of Array.from(store.entries())) {
    if (value.resetAt < now) store.delete(key);
  }
}, CLEANUP_INTERVAL_MS);

export interface RateLimitOptions {
  /** Time window in milliseconds (e.g. 15 * 60 * 1000 for 15 minutes) */
  windowMs: number;
  /** Max requests per window per client */
  max: number;
}

/**
 * Extracts client identifier for rate limiting.
 * Uses X-Forwarded-For when behind a proxy, otherwise req.ip / socket address.
 */
function getClientKey(req: Request): string {
  const forwarded = req.header("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

/**
 * Rate limit middleware factory.
 *
 * Uses a fixed-window counter per client. Returns 429 when the limit is exceeded.
 * Sets Retry-After and X-RateLimit-* headers for client awareness.
 */
export function rateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = getClientKey(req);
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + options.windowMs };
      store.set(key, entry);
    }

    entry.count += 1;

    if (entry.count > options.max) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSec));
      res.setHeader("X-RateLimit-Limit", String(options.max));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.status(429).json({
        message: "Too many requests. Please try again later.",
        retryAfter: retryAfterSec,
      });
      return;
    }

    res.setHeader("X-RateLimit-Limit", String(options.max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, options.max - entry.count)));

    next();
  };
}

/** Pre-configured rate limiter for auth routes (login, register). */
export const rateLimitAuth = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window (covers ~1 attempt/min for brute-force protection)
});
