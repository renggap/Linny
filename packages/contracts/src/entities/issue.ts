import { z } from 'zod';
import { issueStatusEnumSchema, issuePriorityEnumSchema } from './enums.js';

/**
 * Issue Entity
 */
export const issueSchema = z.object({
  /** Issue ID */
  id: z.string(),
  /** Issue identifier (e.g., "ENG-123") */
  identifier: z.string(),
  /** Issue title */
  title: z.string(),
  /** Issue description */
  description: z.string().optional(),
  /** Issue status */
  status: issueStatusEnumSchema,
  /** Issue priority */
  priority: issuePriorityEnumSchema,
  /** Project ID this issue belongs to */
  projectId: z.string(),
  /** Array of assigned user IDs */
  assigneeIds: z.array(z.string()),
  /** Parent issue ID (if this is a subtask) */
  parentId: z.string().optional().nullable(),
  /** Start date (YYYY-MM-DD format or ISO date) */
  startDate: z.coerce.date().optional().nullable(),
  /** Due date (YYYY-MM-DD format or ISO date) */
  dueDate: z.coerce.date().optional().nullable(),
  /** When the issue was created */
  createdAt: z.coerce.date(),
  /** When the issue was last updated */
  updatedAt: z.coerce.date(),
});

export type Issue = z.infer<typeof issueSchema>;

/**
 * Partial Issue (for creating/updating)
 */
export const partialIssueSchema = issueSchema.partial();
export type PartialIssue = z.infer<typeof partialIssueSchema>;
