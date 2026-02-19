import { z } from "zod";

/** Username: 3–50 chars, alphanumeric + underscore/dash */
export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(50, "Username must be at most 50 characters")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username may only contain letters, numbers, underscores, and hyphens",
  )
  .trim();

/** Password: min 8 chars for security */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters");

/** Request body for POST /api/auth/register */
export const registerBodySchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

/** Request body for POST /api/auth/login */
export const loginBodySchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
