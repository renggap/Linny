import { z } from 'zod';

/**
 * Common pagination schema
 * Used across different query types
 */
export const paginationSchema = z.object({
  /** Page number (1-indexed) */
  page: z.coerce.number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .max(1000, 'Page number too large')
    .optional(),

  /** Items per page */
  limit: z.coerce.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(500, 'Limit must be at most 500')
    .optional(),
});

/**
 * Common filters schema
 * Used for activity queries and other list operations
 */
export const commonFiltersSchema = paginationSchema.extend({
  /** Maximum number of items to return */
  limit: z.coerce.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(500, 'Limit must be at most 500')
    .optional(),
});

/**
 * Pagination type
 */
export type Pagination = z.infer<typeof paginationSchema>;

/**
 * Common filters type
 */
export type CommonFilters = z.infer<typeof commonFiltersSchema>;
