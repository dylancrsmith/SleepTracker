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
  // Mandatory
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100).trim(),
  email: z.string().email("Please enter a valid email address").trim().toLowerCase(),
  age: z.number().int().min(13, "You must be at least 13 to use this app").max(120),
  // Optional
  weight: z.number().int().min(20).max(500).optional(),
  gender: z.enum(["male", "female", "non-binary", "prefer not to say"]).optional(),
  activityLevel: z.enum(["sedentary", "lightly active", "active", "very active"]).optional(),
});

/** Request body for POST /api/auth/login */
export const loginBodySchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
