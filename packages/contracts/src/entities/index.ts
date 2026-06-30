/**
 * Entity Types
 *
 * Core domain entities for the Linny application.
 *
 * @module entities
 */

export * from './enums.js';
export * from './user.js';
export * from './team.js';
export * from './project.js';
export * from './issue.js';

// Re-export commonly used types for convenience
export type { User } from './user.js';
export type { Team, TeamMember } from './team.js';
export type { Project, ProjectLink } from './project.js';
export type { Issue, PartialIssue } from './issue.js';
// Comment and Notification types are exported above via their schemas

// Import schemas from enums for notification
import { z } from 'zod';
import { notificationTypeEnumSchema } from './enums.js';

/**
 * Comment Entity
 */
export const commentSchema = z.object({
  /** Comment ID */
  id: z.string(),
  /** Issue ID this comment belongs to */
  issueId: z.string(),
  /** User ID who wrote the comment */
  userId: z.string(),
  /** Comment content */
  content: z.string(),
  /** When the comment was created */
  createdAt: z.coerce.date(),
  /** When the comment was last updated */
  updatedAt: z.coerce.date(),
});

export type Comment = z.infer<typeof commentSchema>;

/**
 * Notification Entity
 */
export const notificationSchema = z.object({
  /** Notification ID */
  id: z.string(),
  /** User ID this notification is for */
  userId: z.string(),
  /** Notification type */
  type: notificationTypeEnumSchema,
  /** Issue ID this notification relates to (optional) */
  issueId: z.string().optional().nullable(),
  /** Whether the notification has been read */
  isRead: z.boolean().optional().default(false),
  /** Notification message/title */
  title: z.string().optional(),
  /** Notification content/details */
  message: z.string().optional(),
  /** User ID who triggered the notification (actor) */
  actorId: z.string().optional().nullable(),
  /** When the notification was created */
  createdAt: z.coerce.date(),
});

export type Notification = z.infer<typeof notificationSchema>;
