import { z } from 'zod';

/**
 * User Role Enum (Zod)
 *
 * Defines the permission level of a user globally or within a team.
 */
export const userRoleEnumSchema = z.enum([
  'Administrator',
  'TeamLead',
  'Member',
  'Guest'
]);

export type UserRole = z.infer<typeof userRoleEnumSchema>;

/**
 * Issue Status Enum (Zod)
 *
 * Defines the workflow status of an issue.
 */
export const issueStatusEnumSchema = z.enum([
  'Backlog',
  'Todo',
  'InProgress',
  'InReview',
  'Done',
  'Canceled'
]);

export type IssueStatus = z.infer<typeof issueStatusEnumSchema>;

/**
 * Issue Priority Enum (Zod)
 *
 * Defines the priority level of an issue.
 */
export const issuePriorityEnumSchema = z.enum([
  'NoPriority',
  'Urgent',
  'High',
  'Medium',
  'Low'
]);

export type IssuePriority = z.infer<typeof issuePriorityEnumSchema>;

/**
 * Notification Type Enum (Zod)
 *
 * Defines the type of notification.
 */
export const notificationTypeEnumSchema = z.enum([
  'mention',
  'dueDate',
  'joinRequest'
]);

export type NotificationType = z.infer<typeof notificationTypeEnumSchema>;
