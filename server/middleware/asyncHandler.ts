import type { Request, Response, NextFunction } from "express";

/** Handler that may be sync or async */
type RouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

/**
 * Wraps async route handlers so thrown errors are passed to the error middleware.
 *
 * Express does NOT catch errors from async handlers by default—they become
 * unhandled promise rejections. This wrapper catches rejections and calls next(err).
 *
 * Usage:
 *   router.post('/login', asyncHandler(authController.login));
 */
export function asyncHandler(fn: RouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
