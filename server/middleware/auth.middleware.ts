import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Unauthorized } from "./errorHandler.middleware";

/**
 * Extend Express Request so controllers can access req.user
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
      };
    }
  }
}

/**
 * requireAuth middleware
 *
 * Reads the JWT from the Authorization header ("Bearer <token>"),
 * verifies it, and attaches the decoded payload to req.user.
 * If the token is missing or invalid, responds with 401.
 *
 * Usage: router.get('/protected', requireAuth, handler)
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(Unauthorized("No token provided"));
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      username: string;
    };
    req.user = payload;
    next();
  } catch {
    next(Unauthorized("Invalid or expired token"));
  }
}
