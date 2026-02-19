import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "@shared/schema";
import { validate } from "../middleware/validate.middleware";
import { asyncHandler } from "../middleware/asyncHandler";
import { Conflict, Unauthorized } from "../middleware/errorHandler.middleware";
import { registerBodySchema, loginBodySchema } from "../schemas/auth.schemas";

const router = Router();

const SALT_ROUNDS = 12;

/**
 * POST /api/auth/register
 * Creates a new user account.
 * Returns a JWT token so the user is immediately logged in.
 */
router.post(
  "/register",
  validate({ body: registerBodySchema }),
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    // Check if username is already taken
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existing.length > 0) {
      throw Conflict("Username is already taken");
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert new user
    const [newUser] = await db
      .insert(users)
      .values({ username, password: hashedPassword })
      .returning();

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, username: newUser.username },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions
    );

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: { id: newUser.id, username: newUser.username },
    });
  })
);

/**
 * POST /api/auth/login
 * Authenticates an existing user.
 * Returns a JWT token on success.
 */
router.post(
  "/login",
  validate({ body: loginBodySchema }),
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    // Find user by username
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      throw Unauthorized("Invalid username or password");
    }

    // Compare provided password with stored hash
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw Unauthorized("Invalid username or password");
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions
    );

    res.json({
      message: "Logged in successfully",
      token,
      user: { id: user.id, username: user.username },
    });
  })
);

/**
 * GET /api/auth/me
 * Returns the currently logged-in user's info.
 * Protected — requires a valid JWT token.
 */
router.get(
  "/me",
  asyncHandler(async (req, res) => {
    // Auth header: "Bearer <token>"
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw Unauthorized("No token provided");
    }

    const token = authHeader.split(" ")[1];

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string;
        username: string;
      };

      const [user] = await db
        .select({ id: users.id, username: users.username })
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!user) {
        throw Unauthorized("User not found");
      }

      res.json({ user });
    } catch {
      throw Unauthorized("Invalid or expired token");
    }
  })
);

export default router;
