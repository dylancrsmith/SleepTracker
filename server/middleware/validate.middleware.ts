import type { Request, Response, NextFunction } from "express";
import type { ZodSchema, ZodError } from "zod";

/**
 * Validation options - specify which parts of the request to validate.
 * Each schema validates and replaces the corresponding request property with parsed (coerced) values.
 */
export interface ValidateOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Formats Zod validation errors into a consistent API response shape.
 */
function formatZodError(err: ZodError): { path: string[]; message: string }[] {
  return err.errors.map((e) => ({
    path: e.path.map(String),
    message: e.message,
  }));
}

/**
 * Validation middleware factory.
 *
 * Validates req.body, req.query, and/or req.params against the provided Zod schemas.
 * On success: replaces request properties with parsed values and calls next().
 * On failure: responds with 400 and structured validation errors.
 *
 * Usage:
 *   router.post('/register', validate({ body: registerSchema }), authController.register);
 *   router.get('/user/:id', validate({ params: idParamSchema }), userController.getById);
 */
export function validate(options: ValidateOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (options.body) {
        req.body = options.body.parse(req.body ?? {});
      }
      if (options.query) {
        req.query = options.query.parse(req.query) as typeof req.query;
      }
      if (options.params) {
        req.params = options.params.parse(req.params) as typeof req.params;
      }
      next();
    } catch (err) {
      if (err && typeof err === "object" && "errors" in err) {
        const zodErr = err as ZodError;
        res.status(400).json({
          message: "Validation failed",
          errors: formatZodError(zodErr),
        });
        return;
      }
      next(err);
    }
  };
}
