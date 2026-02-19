/**
 * Config module - Central configuration for the SleepTracker backend.
 *
 * DESIGN: Loads and validates all environment variables in one place.
 * This ensures:
 * - No scattered process.env access
 * - Fast-fail at startup if required vars are missing
 * - Type-safe config object for the rest of the app
 */

const required = (name: string): string => {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required env var: ${name}. Add it to .env or your environment.`,
    );
  }
  return value;
};

const optional = (name: string, fallback: string): string => {
  return process.env[name]?.trim() || fallback;
};

/**
 * Application config, derived from environment variables.
 */
export const config = {
  /** Database connection string (PostgreSQL). */
  databaseUrl: required("DATABASE_URL"),

  /** Secret for signing/verifying JWT tokens. Must be kept secure in production. */
  jwtSecret: required("JWT_SECRET"),

  /** JWT token expiry (e.g. "7d", "24h"). */
  jwtExpiresIn: optional("JWT_EXPIRES_IN", "7d"),

  /** Server port. */
  port: parseInt(optional("PORT", "5000"), 10),

  /** Node environment: development | production */
  nodeEnv: optional("NODE_ENV", "development"),
} as const;

export type Config = typeof config;
