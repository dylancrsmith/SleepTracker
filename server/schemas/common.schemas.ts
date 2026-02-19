import { z } from "zod";

/** UUID v4 param (e.g. for /user/:id) */
export const idParamSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});

/** Pagination query params */
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type IdParam = z.infer<typeof idParamSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
