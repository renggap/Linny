import { z } from 'zod';

/**
 * Issue Status Enum (Zod)
 */
export const statusSchema = z.enum([
  'Backlog',
  'Todo',
  'InProgress',
  'InReview',
  'Done',
  'Canceled'
]);

export type Status = z.infer<typeof statusSchema>;

/**
 * Issue Priority Enum (Zod)
 */
export const prioritySchema = z.enum([
  'NoPriority',
  'Urgent',
  'High',
  'Medium',
  'Low'
]);

export type Priority = z.infer<typeof prioritySchema>;

/**
 * Issue Filters Schema
 *
 * Separate from scope - these are query parameters that filter
 * results within a given scope.
 */
export const issueFiltersSchema = z.object({
  /** Filter by issue status */
  status: statusSchema.optional(),

  /** Filter by assignee user ID */
  assigneeId: z.string().optional(),

  /** Filter by assignee being null (unassigned) */
  assigneeIdIsNull: z.boolean().optional(),

  /** Search in title, description, or identifier */
  search: z.string()
    .min(1, 'Search term must be at least 1 character')
    .max(100, 'Search term must be less than 100 characters')
    .trim()
    .optional(),

  /** Pagination: page number */
  page: z.coerce.number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .max(1000, 'Page number too large')
    .optional(),

  /** Pagination: items per page */
  limit: z.coerce.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be at most 100')
    .optional(),
});

/**
 * Issue filters type
 */
export type IssueFilters = z.infer<typeof issueFiltersSchema>;

/**
 * Validates raw data as issue filters
 * @throws {ZodError} If validation fails
 */
export function parseIssueFilters(data: unknown): IssueFilters {
  return issueFiltersSchema.parse(data);
}

/**
 * Safely parses raw data as issue filters
 * Returns undefined if validation fails
 */
export function safeParseIssueFilters(data: unknown): IssueFilters | undefined {
  const result = issueFiltersSchema.safeParse(data);
  return result.success ? result.data : undefined;
}
